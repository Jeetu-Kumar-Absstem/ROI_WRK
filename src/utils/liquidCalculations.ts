import type { FlowData, RoiInputs, RoiResult } from '../types/calculator';
import { COMPRESSOR_DATA, FLOW_DATA, OXYGEN_FLOW_DATA } from '../types/calculator';
import { findMatchingCompressor } from './flowMatching';

/**
 * Returns the maximum single-unit flow for the given gas type and purity,
 * capped by the largest available compressor's airFlow.
 * Oxygen: ~250 NM³/hr (purity 95). Nitrogen: ~2362 NM³/hr (purity-dependent).
 */
const getLargeFlowThreshold = (
  gasType: 'nitrogen' | 'oxygen',
  purity: number
): number => {
  const maxCompressorAirFlow = Math.max(...COMPRESSOR_DATA.map(c => c.airFlow));
  const validFlows = getFlowData(gasType)
    .filter(d => d.purity === purity && d.airRequirement <= maxCompressorAirFlow)
    .map(d => d.flow);
  return validFlows.length > 0 ? Math.max(...validFlows) : 2362;
};

const getFlowData = (gasType: 'nitrogen' | 'oxygen') =>
  gasType === 'oxygen' ? OXYGEN_FLOW_DATA : FLOW_DATA;

const toSingleUnitMatch = (flow: FlowData) => ({
  flow: flow.flow,
  airRequirement: flow.airRequirement,
  units: 1,
  totalFlow: flow.flow,
  totalAirRequirement: flow.airRequirement,
});

const findLiquidSingleFlow = (
  requiredFlow: number,
  purity: number,
  gasType: 'nitrogen' | 'oxygen'
) => {
  const purityFlows = getFlowData(gasType)
    .filter((data) => data.purity === purity)
    .sort((a, b) => a.flow - b.flow);

  if (purityFlows.length === 0) return null;

  const singleMatch = purityFlows.find((data) => data.flow >= requiredFlow);
  return toSingleUnitMatch(singleMatch || purityFlows[purityFlows.length - 1]);
};

const findLiquidMultiUnitFlow = (
  requiredFlow: number,
  purity: number,
  gasType: 'nitrogen' | 'oxygen',
  selectedFlow?: number
) => {
  const maxCompressorAirFlow = Math.max(...COMPRESSOR_DATA.map((compressor) => compressor.airFlow));
  const validFlows = getFlowData(gasType)
    .filter((data) => data.purity === purity && data.airRequirement <= maxCompressorAirFlow)
    .sort((a, b) => a.flow - b.flow);

  if (validFlows.length === 0) return null;

  const chosen = selectedFlow
    ? validFlows.find((data) => data.flow === selectedFlow)
    : validFlows[validFlows.length - 1];

  if (!chosen) return null;

  const units = Math.ceil(requiredFlow / chosen.flow);
  return {
    flow: chosen.flow,
    airRequirement: chosen.airRequirement,
    units,
    totalFlow: chosen.flow * units,
    totalAirRequirement: chosen.airRequirement * units,
  };
};

export function calculateLiquidRoi(inputs: RoiInputs): RoiResult {
  // ─── Step 1: Per Hour Consumption ───
  const perHourConsumption =
    inputs.plantRunningHours > 0 ? (inputs.gasUsedPerDay ?? 0) / inputs.plantRunningHours : 0;

  // ─── Step 2: Match PSA Plant Flow ───
  // Threshold is gas-type+purity-aware: ~250 for oxygen, ~2362 for nitrogen (purity-dependent).
  const LARGE_FLOW_THRESHOLD = getLargeFlowThreshold(inputs.gasType, inputs.purity);
  const isLargeFlow = perHourConsumption > LARGE_FLOW_THRESHOLD;
  const matchedFlow = isLargeFlow
    ? findLiquidMultiUnitFlow(perHourConsumption, inputs.purity, inputs.gasType, inputs.selectedFlow)
    : findLiquidSingleFlow(perHourConsumption, inputs.purity, inputs.gasType);

  const plantUnits = matchedFlow?.units ?? 1;
  const psaPlantFlow = matchedFlow?.flow ?? 0;           // single unit flow
  const psaTotalFlow = matchedFlow?.totalFlow ?? psaPlantFlow; // flow × N

  // ─── Step 3: Match Compressor (always single-unit airRequirement) ───
  // Compressor is matched per unit — utilization ratio is a per-unit property.
  // N cancels out: (airReqSingle × N) / (compAirFlow × N) = airReqSingle / compAirFlow
  const airRequirementSingle = matchedFlow?.airRequirement ?? 0;  // single unit air needed
  const matchedCompressor = findMatchingCompressor(airRequirementSingle);

  const compressorKWSingle = matchedCompressor?.kw ?? 0;          // single unit KW
  const compressorAirFlow  = matchedCompressor?.airFlow ?? 0;     // single unit capacity

  // ─── Step 4: Utilization Factor ───
  // Ratio of what PSA needs vs what compressor delivers — always single-unit.
  // Valid for both single unit (N=1) and multi-unit (N>1) since N cancels.
  const utilizationFactor = compressorAirFlow > 0
    ? airRequirementSingle / compressorAirFlow
    : 0;

  // ─── Step 5: Power ───
  // Scale KW by N for total power, then apply loadFactor
  const compressorKWTotal = compressorKWSingle * plantUnits;      // KW × N
  const power = compressorKWTotal * inputs.loadFactor;

  // ─── Step 6: PSA Unit Price ───
  // utilizationFactor applied here — same formula as cylinderCalculations.ts
  // power already has N baked in; psaTotalFlow = flow × N; N cancels correctly
  const unitPricePSA = psaTotalFlow > 0
    ? (power * inputs.powerCostPerUnit * utilizationFactor) / psaTotalFlow
    : 0;

  // ─── Step 7: Liquid Side Costs ───
  const monthlyConsumption =
    perHourConsumption * inputs.plantRunningHours * inputs.workingDaysPerMonth;

  const monthlyExpenseCylinder =
    monthlyConsumption * (inputs.unitPricePerNm3 ?? 0) + (inputs.monthlyRentalCost ?? 0);

  // ─── Step 8: Savings ───
  const savingsPerM3 = (inputs.unitPricePerNm3 ?? 0) - unitPricePSA;
  const monthlySavingsPSA = monthlyConsumption * savingsPerM3;
  const yearlySavingsPSA = monthlySavingsPSA * 12;

  // ─── Step 9: Annual Costs ───
  const annualInterest = (inputs.investmentCost ?? 0) * (inputs.interestRate / 100);
  const annualDepreciation = (inputs.investmentCost ?? 0) * (inputs.depreciationRate / 100);

  const totalRunningCostCylinder = monthlyExpenseCylinder * 12;
  const totalRunningCostPSA =
    monthlyConsumption * unitPricePSA * 12 +
    (inputs.annualMaintenanceCost ?? 0) +
    annualInterest -
    annualDepreciation;

  const annualSavings = totalRunningCostCylinder - totalRunningCostPSA;

  // ─── Step 10: ROI ───
  let roiPercentage: number | undefined;
  let paybackPeriodMonths: number | undefined;

  if ((inputs.investmentCost ?? 0) > 0) {
    roiPercentage = (annualSavings / (inputs.investmentCost ?? 1)) * 100;
    if (annualSavings > 0) {
      paybackPeriodMonths = (inputs.investmentCost ?? 0) / (annualSavings / 12);
    }
  }

  return {
    perHourConsumption,
    unitPricePerM3: inputs.unitPricePerNm3 ?? 0,
    monthlyConsumption,
    monthlyExpenseCylinder,
    power,
    unitPricePSA,
    savingsPerM3,
    monthlySavingsPSA,
    yearlySavingsPSA,
    totalRunningCostCylinder,
    totalRunningCostPSA,
    annualSavings,
    // Return total air requirement for display (all units combined)
    airRequirement: airRequirementSingle * plantUnits,
    roiPercentage,
    paybackPeriodMonths,
    cylinderOperatorCostYear: 0,
    psaOperatorCostYear: 0,
    annualRentalCost: (inputs.monthlyRentalCost ?? 0) * 12,
    // Now the real utilization ratio, not inputs.loadFactor
    utilizationFactor,
    compressorKW: compressorKWSingle,
    // Single unit flow for breakdown display; total flow available via psaTotalFlow
    // isLargeFlow ? show total : show single — consistent with cylinderCalculations.ts
    psaPlantFlow: isLargeFlow ? psaTotalFlow : psaPlantFlow,
    adjustedAnnualSavings: undefined,
    annualInterest,
    annualDepreciation,
    psaCostBreakdown: undefined,
    roiTimelineData: [],
    yearlyData: [],
  };
}