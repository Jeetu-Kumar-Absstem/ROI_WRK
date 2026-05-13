import { CompressorData, NitrogenModel, OperationalParams, YearlyData } from '../components/types';
import { DeoxoDataItem } from '../data/deoxoData';

export interface PsaSystemInput {
  model: NitrogenModel;
  compressor: CompressorData;
  utilizationFactor: number;
  plantCost: number;
}

export interface DeoxoSystemInput extends PsaSystemInput {
  requiredPurity: string;
  reagentType: 'hydrogen' | 'ammonia';
  reagentCostPerKg: number;
  waterCostPerM3: number;
  deoxoData: DeoxoDataItem;
}

export interface CalculatedPsaSystem {
  model: NitrogenModel;
  compressor: CompressorData;
  nitrogenSupply: number;
  requiredAirFlow: number;
  compressorKW: number;
  totalInputPower: number;
  specificPower: number;
  utilizationFactor: number;
  plantCost: number;
  annualPowerCost: number;
  annualOperatingCost: number;
  tenYearCost: number;
}

export interface CalculatedDeoxoSystem extends CalculatedPsaSystem {
  requiredPurity: string;
  reagentType: 'hydrogen' | 'ammonia';
  deoxoFlow: number;
  consumptionKgHr: number;
  coolingWaterFlow: number;
  dryerHeaterPower: number;
  ammoniaCrackerPower?: number;
  reagentCostPerKg: number;
  waterCostPerM3: number;
  hourlyPowerAddonCost: number;
  hourlyConsumableCost: number;
  annualConsumableCost: number;
}

export interface DeoxoComparisonResults {
  psa: CalculatedPsaSystem;
  deoxo: CalculatedDeoxoSystem;
  comparison: {
    annualSavings: number;
    totalSavings: number;
    roiYears: number | null;
    yearlyData: YearlyData[];
  };
}

function calculatePsaBase(system: PsaSystemInput, params: OperationalParams): CalculatedPsaSystem {
  const nitrogenSupply = parseFloat(system.model.Flow);
  const requiredAirFlow = parseFloat(system.model.AirRequirement);
  const compressorKW = system.compressor.kw;
  const compressorAirflow = system.compressor.airFlow;
  const flowUtilization = nitrogenSupply > 0 ? params.flowRequired / nitrogenSupply : 0;
  const compressorLoad = compressorAirflow > 0 ? requiredAirFlow / compressorAirflow : 0;
  const proportionalPower = compressorKW * compressorLoad;
  const totalInputPower = proportionalPower * system.utilizationFactor * flowUtilization;
  const specificPower = nitrogenSupply > 0 ? totalInputPower / nitrogenSupply : 0;
  const annualPowerCost = totalInputPower * params.totalRunningHours * params.powerCostPerUnit;
  const annualOperatingCost = annualPowerCost;
  const tenYearCost = system.plantCost + annualOperatingCost * 10;

  return {
    model: system.model,
    compressor: system.compressor,
    nitrogenSupply,
    requiredAirFlow,
    compressorKW,
    totalInputPower,
    specificPower,
    utilizationFactor: system.utilizationFactor,
    plantCost: system.plantCost,
    annualPowerCost,
    annualOperatingCost,
    tenYearCost,
  };
}

export function calculateDeoxoComparisonResults(
  psaInput: PsaSystemInput,
  deoxoInput: DeoxoSystemInput,
  params: OperationalParams
): DeoxoComparisonResults {
  const psa = calculatePsaBase(psaInput, params);
  const deoxoPsaBase = calculatePsaBase(deoxoInput, params);

  const reagentConsumption =
    deoxoInput.reagentType === 'hydrogen'
      ? deoxoInput.deoxoData.hydrogenConsumptionKgHr ?? 0
      : deoxoInput.deoxoData.ammoniaConsumptionKgHr ?? 0;
  const ammoniaCrackerPower = deoxoInput.reagentType === 'ammonia'
    ? deoxoInput.deoxoData.ammoniaCrackerPower ?? 0
    : undefined;
  const totalInputPower =
    deoxoPsaBase.totalInputPower +
    deoxoInput.deoxoData.dryerHeaterPower +
    (ammoniaCrackerPower ?? 0);
  const specificPower = deoxoInput.deoxoData.flow > 0 ? totalInputPower / deoxoInput.deoxoData.flow : 0;
  const annualPowerCost = deoxoPsaBase.annualPowerCost;
  const hourlyPowerAddonCost =
    (deoxoInput.deoxoData.dryerHeaterPower + (ammoniaCrackerPower ?? 0)) * params.powerCostPerUnit;
  const hourlyConsumableCost =
    deoxoInput.reagentCostPerKg * reagentConsumption +
    deoxoInput.waterCostPerM3 * deoxoInput.deoxoData.coolingWaterFlow +
    hourlyPowerAddonCost;
  const annualConsumableCost = hourlyConsumableCost * params.totalRunningHours;
  const annualOperatingCost = annualPowerCost + annualConsumableCost;
  const tenYearCost = deoxoInput.plantCost + annualOperatingCost * 10;

  const deoxo: CalculatedDeoxoSystem = {
    ...deoxoPsaBase,
    requiredPurity: deoxoInput.requiredPurity,
    reagentType: deoxoInput.reagentType,
    deoxoFlow: deoxoInput.deoxoData.flow,
    consumptionKgHr: reagentConsumption,
    coolingWaterFlow: deoxoInput.deoxoData.coolingWaterFlow,
    dryerHeaterPower: deoxoInput.deoxoData.dryerHeaterPower,
    ...(ammoniaCrackerPower !== undefined ? { ammoniaCrackerPower } : {}),
    reagentCostPerKg: deoxoInput.reagentCostPerKg,
    waterCostPerM3: deoxoInput.waterCostPerM3,
    hourlyPowerAddonCost,
    totalInputPower,
    specificPower,
    annualPowerCost,
    hourlyConsumableCost,
    annualConsumableCost,
    annualOperatingCost,
    tenYearCost,
  };

  const annualSavings = psa.annualOperatingCost - deoxo.annualOperatingCost;
  const totalSavings = psa.tenYearCost - deoxo.tenYearCost;
  const roiYears = annualSavings > 0 && deoxo.plantCost > 0
    ? deoxo.plantCost / annualSavings
    : null;

  const yearlyData: YearlyData[] = [];
  for (let year = 0; year <= 10; year += 1) {
    const psaCost = psa.plantCost + psa.annualOperatingCost * year;
    const deoxoCost = deoxo.plantCost + deoxo.annualOperatingCost * year;

    yearlyData.push({
      year,
      absstemCost: psaCost,
      competitionCost: deoxoCost,
      savings: psaCost - deoxoCost,
    });
  }

  return {
    psa,
    deoxo,
    comparison: {
      annualSavings,
      totalSavings,
      roiYears,
      yearlyData,
    },
  };
}
