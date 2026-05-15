import type { RoiInputs, RoiResult } from '../types/calculator';
import { findMatchingFlow, findMatchingCompressor } from './flowMatching';

export function calculateRoi(inputs: RoiInputs): RoiResult {
  // Calculate per hour consumption
  const perHourConsumption = inputs.gasUsedPerDay! / inputs.plantRunningHours;

  // Use user-selected flow/compressor from ModelSelector if provided,
  // otherwise fall back to auto-matching from lookup tables
  const autoMatchedFlow = findMatchingFlow(perHourConsumption, inputs.purity, inputs.gasType);
  const autoMatchedCompressor = findMatchingCompressor(
    autoMatchedFlow ? autoMatchedFlow.airRequirement : 0
  );

  // PSA plant flow: prefer user selection over auto-match
  const psaPlantFlow = inputs.selectedFlow ?? (autoMatchedFlow ? autoMatchedFlow.flow : 0);

  // Air requirement: prefer user selection over auto-match
  const airRequirement = inputs.selectedAirRequirement ?? (autoMatchedFlow ? autoMatchedFlow.airRequirement : 0);

  // Compressor KW: prefer user selection over auto-match
  const compressorKW = inputs.selectedCompressorKW ?? (autoMatchedCompressor ? autoMatchedCompressor.kw : 0);

  // Calculate monthly consumption based on working days
  const monthlyConsumption = perHourConsumption * inputs.plantRunningHours * inputs.workingDaysPerMonth;

  // Calculate monthly expense with rental cost included
  const monthlyExpenseCylinder = (monthlyConsumption * inputs.unitPricePerNm3!) + (inputs.monthlyRentalCost ?? 0);

  // Calculate power consumption using selected compressor KW
  const power = compressorKW * inputs.loadFactor;

  // Calculate unit price per m3 for PSA using selected flow
  const unitPricePSA = psaPlantFlow > 0 ? (power * inputs.powerCostPerUnit) / psaPlantFlow : 0;

  // Calculate savings
  const savingsPerM3 = inputs.unitPricePerNm3! - unitPricePSA;
  const monthlySavingsPSA = monthlyConsumption * savingsPerM3;
  const yearlySavingsPSA = monthlySavingsPSA * 12;

  const annualInterest = (inputs.investmentCost ?? 0) * (inputs.interestRate / 100);
  const annualDepreciation = (inputs.investmentCost ?? 0) * (inputs.depreciationRate / 100);

  // Calculate annual costs
  const totalRunningCostCylinder = monthlyExpenseCylinder * 12;
  const totalRunningCostPSA =
    (monthlyConsumption * unitPricePSA) * 12 +
    (inputs.annualMaintenanceCost ?? 0) +
    annualInterest -
    annualDepreciation;
  const annualSavings = totalRunningCostCylinder - totalRunningCostPSA;

  let roiPercentage: number | undefined;
  let paybackPeriodMonths: number | undefined;

  // Calculate ROI only if investment cost is provided
  if (inputs.investmentCost && inputs.investmentCost > 0) {
    roiPercentage = (annualSavings / inputs.investmentCost) * 100;
    paybackPeriodMonths = inputs.investmentCost / ((annualSavings / 12) || 1);
  }

  return {
    perHourConsumption,
    unitPricePerM3: inputs.unitPricePerNm3!,
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
    airRequirement,
    roiPercentage,
    paybackPeriodMonths,
    cylinderOperatorCostYear: 0,
    psaOperatorCostYear: 0,
    annualRentalCost: (inputs.monthlyRentalCost ?? 0) * 12,
    utilizationFactor: inputs.loadFactor,
    compressorKW,
    psaPlantFlow,
    adjustedAnnualSavings: undefined,
    annualInterest,
    annualDepreciation,
    psaCostBreakdown: undefined,
    roiTimelineData: [],
    yearlyData: []
  };
}