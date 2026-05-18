import { CylinderInputs, CylinderResult } from '../types/calculator';
import { findMatchingFlow, findMatchingCompressor } from './flowMatching';

export const calculateCylinderRoi = (inputs: CylinderInputs): CylinderResult => {
  const cylinderVolume = inputs.cylinderVolume === 'other'
    ? (inputs.cylinderVolumeCustom || 0)
    : Number(inputs.cylinderVolume);

  // Basic Calculations
  const perHourConsumption =
    inputs.plantRunningHours > 0 ? (inputs.cylindersPerDay * cylinderVolume) / inputs.plantRunningHours : 0;

  // Find matching flow and air requirement
  const matchedFlowData = findMatchingFlow(perHourConsumption, inputs.purity, inputs.gasType);
  const airRequirement = matchedFlowData ? matchedFlowData.airRequirement : 0;

  // Find matching compressor
  const matchedCompressor = findMatchingCompressor(airRequirement);
  const compressorAirFlow = matchedCompressor ? matchedCompressor.airFlow : 0;

  // Utilization factor (Air Requirement / Compressor Air Flow)
  const utilizationFactor = compressorAirFlow > 0 ? (airRequirement / compressorAirFlow) : 0;

  const unitPricePerM3 = cylinderVolume > 0 ? (inputs.cylinderCost / cylinderVolume) : 0;
  const monthlyConsumption = inputs.plantRunningHours * perHourConsumption * inputs.plantRunningDays;
  const monthlyExpenseCylinder = unitPricePerM3 * monthlyConsumption;

  // PSA Calculations
  // Use user-provided values if set, otherwise fall back to matched values from tables
  const matchedFlowNm3 = matchedFlowData ? matchedFlowData.flow : 0;
  const matchedKW = matchedCompressor ? matchedCompressor.kw : 0;
  const effectiveFlow = (inputs.psaPlantFlow > 0 ? inputs.psaPlantFlow : matchedFlowNm3) || matchedFlowNm3;
  const effectiveKW = (inputs.compressorKW > 0 ? inputs.compressorKW : matchedKW) || matchedKW;

  // power = specific power (kW per Nm3/hr) × actual consumption (loadFactor applied separately)
  const power = (effectiveFlow > 0 && perHourConsumption > 0)
    ? (effectiveKW / effectiveFlow) * perHourConsumption
    : 0;

  // unitPricePSA = cost per m3 of gas produced
  const unitPricePSA = (effectiveFlow > 0 && power > 0)
    ? (power * inputs.powerCostPerUnit * utilizationFactor) / effectiveFlow
    : 0;

  const safeNum = (v: number) => (isNaN(v) || !isFinite(v) ? 0 : v);
  const savingsPerM3 = unitPricePerM3 - safeNum(unitPricePSA);
  const monthlySavingsPSA = monthlyConsumption * savingsPerM3;
  const yearlySavingsPSA = monthlySavingsPSA * 12;

  // Annual rental cost
  const annualRentalCost = inputs.rentalCost * 12;

  // Operating Costs
  const cylinderOperatorCostYear = inputs.cylinderOperatorCostMonth * 12;
  const psaOperatorCostYear = inputs.psaOperatorCostMonth * 12;
  const totalRunningCostCylinder = (monthlyExpenseCylinder * 12) + cylinderOperatorCostYear + annualRentalCost;

  // annualPowerCost = actual energy consumed × tariff
  const annualPowerCost =
    power *
    inputs.loadFactor *
    inputs.powerCostPerUnit *
    inputs.plantRunningHours *
    inputs.plantRunningDays *
    12;
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
    perHourConsumption: safeNum(perHourConsumption),
    unitPricePerM3: safeNum(unitPricePerM3),
    monthlyConsumption: safeNum(monthlyConsumption),
    monthlyExpenseCylinder: safeNum(monthlyExpenseCylinder),
    power: safeNum(power),
    unitPricePSA: safeNum(unitPricePSA),
    savingsPerM3: safeNum(savingsPerM3),
    monthlySavingsPSA: safeNum(monthlySavingsPSA),
    yearlySavingsPSA: safeNum(yearlySavingsPSA),
    cylinderOperatorCostYear: safeNum(cylinderOperatorCostYear),
    psaOperatorCostYear: safeNum(psaOperatorCostYear),
    totalRunningCostCylinder: safeNum(totalRunningCostCylinder),
    totalRunningCostPSA: safeNum(totalRunningCostPSA),
    annualSavings: safeNum(annualSavings),
    airRequirement: safeNum(airRequirement),
    annualRentalCost: safeNum(annualRentalCost),
    annualPowerCost: safeNum(annualPowerCost),
    utilizationFactor: safeNum(utilizationFactor),
    annualInterest: safeNum(annualInterest),
    annualDepreciation: safeNum(annualDepreciation),
    roiPercentage: safeNum(roiPercentage),
    paybackPeriodMonths: safeNum(paybackPeriodMonths)
  };
};