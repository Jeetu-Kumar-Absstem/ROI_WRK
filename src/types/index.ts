export  interface FlowData {
  purity: number;
  flow: number;
  airRequirement: number;
}

export interface CompressorData {
  kw: number;
  airFlow: number;
}

export interface RoiInputs {
  gasType: 'nitrogen' | 'oxygen';
  liquidUsedPerDay: number;
  liquidUnit: string;
  plantRunningHours: number;
  workingDaysPerMonth: number;
  monthlyRentalCost: number;
  purity: number;
  loadFactor: number;
  gasCost: number;
  gasCostUnit: string;
  powerCostPerUnit: number;
  psaPlantFlow: number;
  compressorKW: number;
  investmentCost: number;
  annualMaintenanceCost: number;
  gasUsedPerDay?: number;
  unitPricePerNm3?: number;
}

export interface RoiResult {
  perHourConsumption: number;
  unitPricePerM3: number;
  monthlyConsumption: number;
  monthlyExpenseCylinder: number;
  power: number;
  unitPricePSA: number;
  savingsPerM3: number;
  monthlySavingsPSA: number;
  yearlySavingsPSA: number;
  totalRunningCostCylinder: number;
  totalRunningCostPSA: number;
  annualSavings: number;
  airRequirement: number;
  roiPercentage?: number;
  paybackPeriodMonths?: number;
}

export const GAS_TYPES = [
  { value: 'nitrogen', label: 'Nitrogen' },
  { value: 'oxygen', label: 'Oxygen' }
] as const;

export const LIQUID_UNITS = ['Sm3', 'Nm3', 'Liters', 'Kg'] as const;
export const LOAD_FACTORS = [0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.10] as const;
export const PURITIES = [95, 97, 98, 99, 99.5, 99.9, 99.95, 99.99, 99.995, 99.999] as const;
export const OXYGEN_PURITIES = [95] as const;
 