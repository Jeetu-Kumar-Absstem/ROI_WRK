import { CylinderInputs, CylinderResult } from '../types/calculator';
import { findMatchingFlow, findMatchingCompressor } from './flowMatching';

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

  // ─── Step 2: Auto-match PSA Plant Flow from perHourConsumption ───
  // Never taken from user input — always derived from cylinder inputs
  const matchedFlow = findMatchingFlow(perHourConsumption, inputs.purity, inputs.gasType);
  const airRequirement = matchedFlow ? matchedFlow.airRequirement : 0;
  const autoPlantFlow = matchedFlow ? matchedFlow.flow : 0;

  // ─── Step 3: Auto-match Compressor from airRequirement ───
  // Never taken from user input — always derived from matched plant flow
  const matchedCompressor = findMatchingCompressor(airRequirement);
  const autoCompressorKW = matchedCompressor ? matchedCompressor.kw : 0;
  const autoCompressorAirFlow = matchedCompressor ? matchedCompressor.airFlow : 0;

  // ─── Step 4: Utilization Factor ───
  // Changes only when perHourConsumption changes (i.e. cylinder inputs change)
  const utilizationFactor = autoCompressorAirFlow > 0
    ? (airRequirement / autoCompressorAirFlow)
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
  // power uses autoCompressorKW — NOT inputs.compressorKW
  // unitPricePSA uses autoPlantFlow — NOT inputs.psaPlantFlow
  const power = autoCompressorKW * inputs.loadFactor;
  const unitPricePSA = autoPlantFlow > 0
    ? (power * inputs.powerCostPerUnit * utilizationFactor) / autoPlantFlow
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
    matchedCompressorKW: autoCompressorKW,
    matchedCompressorAirFlow: autoCompressorAirFlow,
    psaPlantFlow: autoPlantFlow,
  };
};