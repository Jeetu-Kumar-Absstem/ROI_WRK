import { CylinderInputs, CylinderResult } from '../types/calculator';
import { findMatchingFlow, findMatchingCompressor } from './flowMatching';

export const calculateCylinderRoi = (inputs: CylinderInputs): CylinderResult => {
  const cylinderVolume = inputs.cylinderVolume === 'other'
    ? (inputs.cylinderVolumeCustom || 0)
    : Number(inputs.cylinderVolume);

  // Basic Calculations
  const perHourConsumption = (inputs.cylindersPerDay * cylinderVolume) / inputs.plantRunningHours;

  // Find matching flow and air requirement
  const matchedFlow = findMatchingFlow(perHourConsumption, inputs.purity, inputs.gasType);
  const airRequirement = matchedFlow ? matchedFlow.airRequirement : 0;

  // Find matching compressor
  const matchedCompressor = findMatchingCompressor(airRequirement);
  const compressorAirFlow = matchedCompressor ? matchedCompressor.airFlow : 0;

  // Calculate utilization factor (Air Requirement / Compressed Air Flow)
  const utilizationFactor = compressorAirFlow > 0 ? (airRequirement / compressorAirFlow) : 0;

  const unitPricePerM3 = cylinderVolume > 0 ? (inputs.cylinderCost / cylinderVolume) : 0;
  const monthlyConsumption = inputs.plantRunningHours * perHourConsumption * inputs.plantRunningDays;
  const monthlyExpenseCylinder = unitPricePerM3 * monthlyConsumption;

  // PSA Calculations - incorporating utilization factor
  const power = inputs.compressorKW * inputs.loadFactor;
  const unitPricePSA = (power * inputs.powerCostPerUnit * utilizationFactor) / inputs.psaPlantFlow;
  const savingsPerM3 = unitPricePerM3 - unitPricePSA;
  const monthlySavingsPSA = monthlyConsumption * savingsPerM3;
  const yearlySavingsPSA = monthlySavingsPSA * 12;

  // Annual rental cost
  const annualRentalCost = inputs.rentalCost * 12;

  // Operating Costs
  const cylinderOperatorCostYear = inputs.cylinderOperatorCostMonth * 12;
  const psaOperatorCostYear = inputs.psaOperatorCostMonth * 12;
  const totalRunningCostCylinder = (monthlyExpenseCylinder * 12) + cylinderOperatorCostYear + annualRentalCost;
  const annualPowerCost = power * inputs.powerCostPerUnit * utilizationFactor * inputs.plantRunningHours * inputs.plantRunningDays * 12;
  const annualMaintenance = inputs.annualMaintenanceCost ?? 0;
  const annualInterest = (inputs.investmentCost ?? 0) * ((inputs.interestRate ?? 0) / 100);
  const annualDepreciation = (inputs.investmentCost ?? 0) * ((inputs.depreciationRate ?? 0) / 100);
  const totalRunningCostPSA = annualPowerCost + psaOperatorCostYear + annualMaintenance + annualInterest - annualDepreciation;

  // Annual Savings
  const annualSavings = totalRunningCostCylinder - totalRunningCostPSA;

  // ROI and Payback
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
    paybackPeriodMonths
  };
};
