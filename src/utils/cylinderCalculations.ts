import { CylinderInputs, CylinderResult, FLOW_DATA, OXYGEN_FLOW_DATA, COMPRESSOR_DATA } from '../types/calculator';
import { findMatchingFlow, findMatchingCompressor, FlowMatchResult } from './flowMatching';

/**
 * Returns the maximum single-unit flow available for the given gas type and purity,
 * restricted to flows whose airRequirement can be served by the largest compressor.
 * When perHourConsumption exceeds this, we switch to N-unit (large-flow) mode.
 *
 * Nitrogen: up to ~2362 NM³/hr (purity-dependent)
 * Oxygen:   up to   250 NM³/hr (only purity 95% is supported)
 */
const getLargeFlowThreshold = (
  gasType: 'nitrogen' | 'oxygen',
  purity: number
): number => {
  const flowData = gasType === 'oxygen' ? OXYGEN_FLOW_DATA : FLOW_DATA;
  const maxCompressorAirFlow = Math.max(...COMPRESSOR_DATA.map(c => c.airFlow));
  const validFlows = flowData
    .filter(d => d.purity === purity && d.airRequirement <= maxCompressorAirFlow)
    .map(d => d.flow);
  return validFlows.length > 0 ? Math.max(...validFlows) : 2362;
};

export const calculateCylinderRoi = (inputs: CylinderInputs): CylinderResult => {
  const cylinderVolume = inputs.cylinderVolume === 'other'
    ? (inputs.cylinderVolumeCustom || 0)
    : Number(inputs.cylinderVolume);

  // ─── Step 1: Per Hour Consumption ───
  // Driven purely by cylinder inputs — psaPlantFlow and compressorKW are derived from this
  const perHourConsumption =
    inputs.plantRunningHours > 0
      ? (inputs.cylindersPerDay * cylinderVolume) / inputs.plantRunningHours
      : 0;

  // ─── Step 2: Match PSA Plant Flow ───
  // In large-flow mode (perHourConsumption > max single-unit flow for this gas+purity)
  // the user picks a single-unit flow size; units are then ceil(required / selectedFlow).
  // Threshold: ~250 NM³/hr for oxygen (purity 95), ~2362 NM³/hr for nitrogen (purity-dependent).
  const LARGE_FLOW_THRESHOLD = getLargeFlowThreshold(inputs.gasType, inputs.purity);
  const isLargeFlow = perHourConsumption > LARGE_FLOW_THRESHOLD;

  let matchedFlow: FlowMatchResult | null = null;

  if (isLargeFlow) {
    // In large-flow mode: use selectedFlow if provided, otherwise default to max available flow
    // (same behaviour as liquidCalculations.ts — always resolve to a concrete flow)
    const flowData = inputs.gasType === 'oxygen' ? OXYGEN_FLOW_DATA : FLOW_DATA;
    const maxCompressorAirFlow = Math.max(...COMPRESSOR_DATA.map(c => c.airFlow));

    // Candidate flows whose airRequirement can be served by an available compressor
    const validFlows = flowData
      .filter(d => d.purity === inputs.purity && d.airRequirement <= maxCompressorAirFlow)
      .sort((a, b) => a.flow - b.flow);

    // Pick the user-chosen flow, or fall back to the largest available flow
    const targetFlow = inputs.selectedFlow
      ? validFlows.find(d => d.flow === inputs.selectedFlow)
      : undefined;
    const chosen = targetFlow ?? (validFlows.length > 0 ? validFlows[validFlows.length - 1] : undefined);

    if (chosen) {
      const n = Math.ceil(perHourConsumption / chosen.flow);
      matchedFlow = {
        flow: chosen.flow,
        airRequirement: chosen.airRequirement,
        purity: chosen.purity,
        units: n,
        totalFlow: chosen.flow * n,
        totalAirRequirement: chosen.airRequirement * n,
      };
    } else {
      // Safety fallback — should never be reached
      matchedFlow = findMatchingFlow(perHourConsumption, inputs.purity, inputs.gasType, {
        allowMultiUnit: true,
        requireCompressorMatch: true,
      });
    }
  } else {
    // Normal auto-match
    matchedFlow = findMatchingFlow(perHourConsumption, inputs.purity, inputs.gasType, {
      allowMultiUnit: isLargeFlow,
      requireCompressorMatch: isLargeFlow,
    });
  }

  const psaPlantUnits          = matchedFlow ? matchedFlow.units : 1;
  const autoPlantFlow          = matchedFlow ? matchedFlow.flow : 0;              // single unit flow
  const autoTotalFlow          = matchedFlow ? matchedFlow.totalFlow : 0;         // total capacity (flow × units)
  const airRequirementSingle   = matchedFlow ? matchedFlow.airRequirement : 0;    // single unit air req
  const airRequirement         = matchedFlow ? matchedFlow.totalAirRequirement : 0; // total air req (all units)

  // ─── Step 3: Auto-match Compressor from single-unit airRequirement ───
  // Compressor is matched per unit — KW and airFlow are then multiplied by units
  const matchedCompressor          = findMatchingCompressor(airRequirementSingle);
  const autoCompressorKW           = matchedCompressor ? matchedCompressor.kw : 0;       // single unit KW
  const autoCompressorTotalKW      = autoCompressorKW * psaPlantUnits;                    // total KW
  const autoCompressorAirFlow      = matchedCompressor ? matchedCompressor.airFlow : 0;   // single unit airFlow
  const autoCompressorTotalAirFlow = autoCompressorAirFlow * psaPlantUnits;               // total airFlow

  // ─── Step 4: Utilization Factor ───
  // Per-unit ratio — N cancels out, so single unit calc = multi-unit calc
  const utilizationFactor = autoCompressorAirFlow > 0
    ? (airRequirementSingle / autoCompressorAirFlow)
    : 0;

  // ─── Step 5: Cylinder Side Costs ───
  const unitPricePerM3 = cylinderVolume > 0 ? (inputs.cylinderCost / cylinderVolume) : 0;
  const monthlyConsumption = inputs.plantRunningHours * perHourConsumption * inputs.plantRunningDays;
  const monthlyExpenseCylinder = unitPricePerM3 * monthlyConsumption;
  const annualRentalCost = inputs.rentalCost * 12;
  const cylinderOperatorCostYear = inputs.cylinderOperatorCostMonth * 12;
  const psaOperatorCostYear = inputs.psaOperatorCostMonth * 12;
  const totalRunningCostCylinder =
    (monthlyExpenseCylinder * 12) + cylinderOperatorCostYear + annualRentalCost;

  // ─── Step 6: PSA Side Costs ───
  // power uses autoCompressorTotalKW (all units combined)
  // unitPricePSA uses autoTotalFlow (total capacity) for accurate per-m³ cost
  const power = autoCompressorTotalKW * inputs.loadFactor;
  const unitPricePSA = autoTotalFlow > 0
    ? (power * inputs.powerCostPerUnit * utilizationFactor) / autoTotalFlow
    : 0;
  const savingsPerM3 = unitPricePerM3 - unitPricePSA;
  const monthlySavingsPSA = monthlyConsumption * savingsPerM3;
  const yearlySavingsPSA = monthlySavingsPSA * 12;

  const annualPowerCost =
    power *
    inputs.powerCostPerUnit *
    utilizationFactor *
    inputs.plantRunningHours *
    inputs.plantRunningDays *
    12;

  const annualMaintenance = inputs.annualMaintenanceCost ?? 0;
  const annualInterest = (inputs.investmentCost ?? 0) * ((inputs.interestRate ?? 0) / 100);
  const annualDepreciation = (inputs.investmentCost ?? 0) * ((inputs.depreciationRate ?? 0) / 100);
  const totalRunningCostPSA =
    annualPowerCost + psaOperatorCostYear + annualMaintenance + annualInterest - annualDepreciation;

  // ─── Step 7: Savings & ROI ───
  const annualSavings = totalRunningCostCylinder - totalRunningCostPSA;
  const investmentCost = inputs.investmentCost ?? 0;
  const roiPercentage = investmentCost > 0 ? (annualSavings / investmentCost) * 100 : 0;
  const paybackPeriodMonths = annualSavings > 0 ? investmentCost / (annualSavings / 12) : 0;

  return {
    perHourConsumption,
    unitPricePerM3,
    monthlyConsumption,
    monthlyExpenseCylinder,
    power,
    unitPricePSA,
    savingsPerM3,
    monthlySavingsPSA,
    yearlySavingsPSA,
    cylinderOperatorCostYear,
    psaOperatorCostYear,
    totalRunningCostCylinder,
    totalRunningCostPSA,
    annualSavings,
    airRequirement,
    annualRentalCost,
    annualPowerCost,
    utilizationFactor,
    annualInterest,
    annualDepreciation,
    roiPercentage,
    paybackPeriodMonths,
    // Auto-matched values — UI displays these as read-only fields
    matchedCompressorKW: autoCompressorKW,           // single unit KW (for breakdown display)
    matchedCompressorTotalKW: autoCompressorTotalKW, // total KW (all units)
    matchedCompressorAirFlow: autoCompressorTotalAirFlow,
    psaPlantFlow: autoPlantFlow,                     // single unit flow (for breakdown display)
    psaTotalFlow: autoTotalFlow,                     // total flow (all units)
    psaPlantUnits,                                   // number of identical units
    isLargeFlow,                                     // flag for UI to show flow picker
  };
};