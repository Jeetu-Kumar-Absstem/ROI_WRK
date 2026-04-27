import { YearlyData } from './types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount);
}

export function calculateResults(data: any) {
  const { absstem, competition, params } = data;
  
  // Extract model and compressor data
  const model = absstem.model;
  const compressor = absstem.compressor;
  
  if (!model || !compressor || !params) {
    return {};
  }
  
  // Convert values
  const absstemPlantCost = absstem.plantCost;
  const competitionPlantCost = competition.plantCost;
  const powerCostPerUnit = params.powerCostPerUnit;
  const totalRunningHours = params.totalRunningHours;
  const requiredFlow = params.flowRequired;
  
  // Calculate Absstem system values
  const nitrogenSupply = parseFloat(model.Flow);
  const compressorKW = compressor.kw;
  const airRequirement = parseFloat(model.AirRequirement);
  const compressorAirflow = compressor.airFlow;
  const flowUtilization = nitrogenSupply > 0 ? requiredFlow / nitrogenSupply : 0;
  
  // Per user request: Total Input Power = (Compressor KW / Compressor Airflow) * Required Airflow * Utilization Factor
  // The previous `absstemUtilizationFactor` was actually the load on the compressor.
  const compressorLoad = compressorAirflow > 0 ? (airRequirement / compressorAirflow) : 0;
  const proportionalPower = compressorKW * compressorLoad;
  const absstemTotalInputPower = proportionalPower * absstem.utilizationFactor * flowUtilization;
  const absstemUtilizationFactor = absstem.utilizationFactor; // This is the new dropdown value
  const absstemSpecificPower = nitrogenSupply > 0 ? absstemTotalInputPower / nitrogenSupply : 0;
  
  // Calculate Competition system values
  const competitionUtilizationFactor = competition.utilizationFactor;
  const competitionCompressorKW = competition.compressorKW;
  const competitionFlowUtilization = competition.flow > 0 ? requiredFlow / competition.flow : 0;
  const competitionTotalInputPower = competitionCompressorKW * competitionUtilizationFactor * competitionFlowUtilization;
  const competitionSpecificPower = competition.flow > 0 ? competitionTotalInputPower / competition.flow : 0;
  
  // Calculate power costs
  const absstemAnnualPowerCost = absstemTotalInputPower * totalRunningHours * powerCostPerUnit;
  const competitionAnnualPowerCost = competitionTotalInputPower * totalRunningHours * powerCostPerUnit;
  
  // Calculate 10-year costs
  const absstemTenYearCost = absstemPlantCost + (absstemAnnualPowerCost * 10);
  const competitionTenYearCost = competitionPlantCost + (competitionAnnualPowerCost * 10);
  
  // Calculate savings and ROI
  const annualSavings = competitionAnnualPowerCost - absstemAnnualPowerCost;
  const totalSavings = competitionTenYearCost - absstemTenYearCost;
  const additionalInvestment = absstemPlantCost - competitionPlantCost;
  const roi = additionalInvestment > 0 ? additionalInvestment / annualSavings : 0;
  
  // Generate yearly cost data
  const yearlyData: YearlyData[] = [];
  for (let year = 0; year <= 10; year++) {
    const absstemCost = absstemPlantCost + (absstemAnnualPowerCost * year);
    const competitionCost = competitionPlantCost + (competitionAnnualPowerCost * year);
    const savings = competitionCost - absstemCost;
    
    yearlyData.push({
      year,
      absstemCost,
      competitionCost,
      savings
    });
  }
  
  return {
    absstem: {
      model,
      compressor,
      nitrogenSupply,
      compressorKW,
      totalInputPower: absstemTotalInputPower,
      specificPower: absstemSpecificPower,
      utilizationFactor: absstemUtilizationFactor,
      plantCost: absstemPlantCost,
      annualPowerCost: absstemAnnualPowerCost,
      tenYearCost: absstemTenYearCost
    },
    competition: {
      flow: competition.flow,
      compressorKW: competitionCompressorKW,
      totalInputPower: competitionTotalInputPower,
      specificPower: competitionSpecificPower,
      utilizationFactor: competitionUtilizationFactor,
      plantCost: competitionPlantCost,
      annualPowerCost: competitionAnnualPowerCost,
      tenYearCost: competitionTenYearCost
    },
    comparison: {
      annualSavings,
      totalSavings,
      roi,
      yearlyData
    }
  };
}