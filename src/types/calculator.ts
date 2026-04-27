export  interface FlowData {
  purity: number;
  flow: number;
  airRequirement: number;
}

export interface CompressorData {
  kw: number;
  airFlow: number;
}

export  interface LiquidRoiInputs {
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
  interestRate?: number;
  depreciationRate?: number;
  gasUsedPerDay?: number;
  unitPricePerNm3?: number;
}

export  interface RoiInputs {
  gasType: 'nitrogen' | 'oxygen';
  gasUsedPerDay: number;
  liquidUsedPerDay?: number;
  liquidUnit?: string;
  plantRunningHours: number;
  workingDaysPerMonth: number;
  gasCost: number;
  gasCostUnit: string;
  unitPricePerNm3?: number;
  monthlyRentalCost?: number;
  purity: number;
  loadFactor: number;
  powerCostPerUnit: number;
  psaPlantFlow: number;
  compressorKW: number;
  investmentCost?: number;
  annualMaintenanceCost?: number;
  interestRate: number;
  depreciationRate: number;
}

export interface CylinderInputs {
  gasType: 'nitrogen' | 'oxygen';
  cylindersPerDay: number;
  plantRunningHours: number;
  plantRunningDays: number;
  cylinderVolume: number | 'other';
  cylinderVolumeCustom: number;
  purity: number;
  loadFactor: number;
  cylinderCost: number;
  powerCostPerUnit: number;
  psaPlantFlow: number;
  compressorKW: number;
  cylinderOperatorCostMonth: number;
  psaOperatorCostMonth: number;
  rentalCost: number;
  // Financials (to align with PSA vs Liquid)
  investmentCost?: number;
  annualMaintenanceCost?: number;
  interestRate?: number; // %
  depreciationRate?: number; // %
}

export interface CylinderResult {
  perHourConsumption: number;
  unitPricePerM3: number;
  monthlyConsumption: number;
  monthlyExpenseCylinder: number;
  power: number;
  unitPricePSA: number;
  savingsPerM3: number;
  monthlySavingsPSA: number;
  yearlySavingsPSA: number;
  cylinderOperatorCostYear: number;
  psaOperatorCostYear: number;
  totalRunningCostCylinder: number;
  totalRunningCostPSA: number;
  annualSavings: number;
  airRequirement: number;
  annualRentalCost: number;
  annualPowerCost: number;
  utilizationFactor: number;
  // Financial outputs
  annualInterest?: number;
  annualDepreciation?: number;
  roiPercentage?: number;
  paybackPeriodMonths?: number;
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
  cylinderOperatorCostYear: number;
  psaOperatorCostYear: number;
  totalRunningCostCylinder: number;
  totalRunningCostPSA: number;
  annualSavings: number;
  airRequirement: number;
  annualRentalCost: number;
  utilizationFactor: number;
  compressorKW?: number;
  psaPlantFlow?: number;
  roiPercentage?: number;
  paybackPeriodMonths?: number;
  adjustedAnnualSavings?: number;
  annualInterest: number;
  annualDepreciation: number;
  psaCostBreakdown?: { name: string; value: number }[];
  roiTimelineData: { month: number; cumulativeSavings: number }[];
  yearlyData: { year: number; cylinderCost: number; psaCost: number; netCashFlow: number; cumulativeCashFlow: number }[];
}

export interface LiquidRoiResult {
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
  adjustedAnnualSavings?: number;
  annualInterest: number;
  annualDepreciation: number;
}



export  const GAS_TYPES = [
  { value: 'nitrogen', label: 'Nitrogen' },
  { value: 'oxygen', label: 'Oxygen' }
] as const;

export const LIQUID_UNITS = ['Sm3', 'Nm3', 'Liters', 'Kg'] as const;
export const LOAD_FACTORS = [0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.10, 1.15, 1.2, 1.25, 1.3] as const;
export  const PURITIES = [95, 97, 98, 99, 99.5, 99.9, 99.95, 99.99, 99.995, 99.999] as const;
export const OXYGEN_PURITIES = [95] as const;  

export const CYLINDER_VOLUMES = [7, 10, 'other'] as const;

export const COMPRESSOR_DATA: CompressorData[] = [
  { kw: 3, airFlow: 14 },
  { kw: 4, airFlow: 20 },
  { kw: 5.5, airFlow: 27 },
  { kw: 7.5, airFlow: 46 },
  { kw: 11, airFlow: 66 },
  { kw: 15, airFlow: 94 },
  { kw: 18.5, airFlow: 113 },
  { kw: 22, airFlow: 127 },
  { kw: 22, airFlow: 145 },
  { kw: 26, airFlow: 171 },
  { kw: 30, airFlow: 205 },
  { kw: 37, airFlow: 254 },
  { kw: 45, airFlow: 275 },
  { kw: 45, airFlow: 315 },
  { kw: 55, airFlow: 360 },
  { kw: 55, airFlow: 394 },
  { kw: 75, airFlow: 520 },
  { kw: 90, airFlow: 602 },
  { kw: 110, airFlow: 734 },
  { kw: 132, airFlow: 890 },
  { kw: 160, airFlow: 1050 },
  { kw: 180, airFlow: 1200 },
  { kw: 200, airFlow: 1332 },
  { kw: 220, airFlow: 1460 },
  { kw: 250, airFlow: 1773 },
  { kw: 250, airFlow: 1911 },
  { kw: 200, airFlow: 1540 },
  { kw: 315, airFlow: 2225 },
  { kw: 355, airFlow: 2384 },
  { kw: 315, airFlow: 2295 },
  { kw: 355, airFlow: 2507 },
  { kw: 320, airFlow: 2100 },
  { kw: 264, airFlow: 1780 },
  { kw: 44, airFlow: 290 }
];

export const FLOW_DATA: FlowData[] = [
  { purity: 95, flow: 14, airRequirement: 15 },
  { purity: 95, flow: 21, airRequirement: 22 },
  { purity: 95, flow: 28, airRequirement: 30 },
  { purity: 95, flow: 39, airRequirement: 41 },
  { purity: 95, flow: 59, airRequirement: 63 },
  { purity: 95, flow: 79, airRequirement: 83 },
  { purity: 95, flow: 93, airRequirement: 98 },
  { purity: 95, flow: 101, airRequirement: 107 },
  { purity: 95, flow: 124, airRequirement: 131 },
  { purity: 95, flow: 142, airRequirement: 150 },
  { purity: 95, flow: 157, airRequirement: 167 },
  { purity: 95, flow: 176, airRequirement: 187 },
  { purity: 95, flow: 197, airRequirement: 208 },
  { purity: 95, flow: 216, airRequirement: 229 },
  { purity: 95, flow: 250, airRequirement: 265 },
  { purity: 95, flow: 282, airRequirement: 299 },
  { purity: 95, flow: 295, airRequirement: 313 },
  { purity: 95, flow: 349, airRequirement: 370 },
  { purity: 95, flow: 394, airRequirement: 417 },
  { purity: 95, flow: 433, airRequirement: 459 },
  { purity: 95, flow: 510, airRequirement: 541 },
  { purity: 95, flow: 535, airRequirement: 567 },
  { purity: 95, flow: 627, airRequirement: 664 },
  { purity: 95, flow: 712, airRequirement: 755 },
  { purity: 95, flow: 787, airRequirement: 834 },
  { purity: 95, flow: 905, airRequirement: 959 },
  { purity: 95, flow: 1048, airRequirement: 1111 },
  { purity: 95, flow: 1181, airRequirement: 1251 },
  { purity: 95, flow: 1299, airRequirement: 1376 },
  { purity: 95, flow: 1574, airRequirement: 1668 },
  { purity: 95, flow: 1868, airRequirement: 1979 },
  { purity: 95, flow: 1968, airRequirement: 2085 },
  { purity: 95, flow: 2362, airRequirement: 2502 },
  { purity: 95, flow: 2805, airRequirement: 2971 },
  { purity: 97, flow: 11, airRequirement: 13 },
  { purity: 97, flow: 17, airRequirement: 20 },
  { purity: 97, flow: 23, airRequirement: 27 },
  { purity: 97, flow: 32, airRequirement: 37 },
  { purity: 97, flow: 48, airRequirement: 56 },
  { purity: 97, flow: 64, airRequirement: 74 },
  { purity: 97, flow: 75, airRequirement: 88 },
  { purity: 97, flow: 82, airRequirement: 95 },
  { purity: 97, flow: 100, airRequirement: 117 },
  { purity: 97, flow: 115, airRequirement: 134 },
  { purity: 97, flow: 128, airRequirement: 149 },
  { purity: 97, flow: 143, airRequirement: 166 },
  { purity: 97, flow: 159, airRequirement: 186 },
  { purity: 97, flow: 175, airRequirement: 204 },
  { purity: 97, flow: 203, airRequirement: 237 },
  { purity: 97, flow: 229, airRequirement: 267 },
  { purity: 97, flow: 239, airRequirement: 279 },
  { purity: 97, flow: 283, airRequirement: 330 },
  { purity: 97, flow: 319, airRequirement: 372 },
  { purity: 97, flow: 351, airRequirement: 409 },
  { purity: 97, flow: 413, airRequirement: 482 },
  { purity: 97, flow: 434, airRequirement: 505 },
  { purity: 97, flow: 508, airRequirement: 592 },
  { purity: 97, flow: 577, airRequirement: 673 },
  { purity: 97, flow: 638, airRequirement: 743 },
  { purity: 97, flow: 733, airRequirement: 855 },
  { purity: 97, flow: 850, airRequirement: 990 },
  { purity: 97, flow: 957, airRequirement: 1115 },
  { purity: 97, flow: 1053, airRequirement: 1226 },
  { purity: 97, flow: 1276, airRequirement: 1487 },
  { purity: 97, flow: 1514, airRequirement: 1764 },
  { purity: 97, flow: 1595, airRequirement: 1858 },
  { purity: 97, flow: 1914, airRequirement: 2230 },
  { purity: 97, flow: 2273, airRequirement: 2648 },
  { purity: 98, flow: 10, airRequirement: 12 },
  { purity: 98, flow: 15, airRequirement: 19 },
  { purity: 98, flow: 20, airRequirement: 25 },
  { purity: 98, flow: 28, airRequirement: 34 },
  { purity: 98, flow: 43, airRequirement: 52 },
  { purity: 98, flow: 57, airRequirement: 69 },
  { purity: 98, flow: 67, airRequirement: 82 },
  { purity: 98, flow: 73, airRequirement: 89 },
  { purity: 98, flow: 90, airRequirement: 109 },
  { purity: 98, flow: 103, airRequirement: 125 },
  { purity: 98, flow: 114, airRequirement: 139 },
  { purity: 98, flow: 128, airRequirement: 155 },
  { purity: 98, flow: 143, airRequirement: 174 },
  { purity: 98, flow: 157, airRequirement: 191 },
  { purity: 98, flow: 181, airRequirement: 221 },
  { purity: 98, flow: 205, airRequirement: 249 },
  { purity: 98, flow: 214, airRequirement: 260 },
  { purity: 98, flow: 253, airRequirement: 308 },
  { purity: 98, flow: 285, airRequirement: 347 },
  { purity: 98, flow: 314, airRequirement: 382 },
  { purity: 98, flow: 369, airRequirement: 450 },
  { purity: 98, flow: 388, airRequirement: 472 },
  { purity: 98, flow: 454, airRequirement: 553 },
  { purity: 98, flow: 516, airRequirement: 628 },
  { purity: 98, flow: 570, airRequirement: 694 },
  { purity: 98, flow: 655, airRequirement: 798 },
  { purity: 98, flow: 759, airRequirement: 925 },
  { purity: 98, flow: 855, airRequirement: 1042 },
  { purity: 98, flow: 941, airRequirement: 1146 },
  { purity: 98, flow: 1140, airRequirement: 1389 },
  { purity: 98, flow: 1353, airRequirement: 1648 },
  { purity: 98, flow: 1425, airRequirement: 1736 },
  { purity: 98, flow: 1710, airRequirement: 2083 },
  { purity: 98, flow: 2031, airRequirement: 2474 },
  { purity: 99, flow: 8, airRequirement: 10 },
  { purity: 99, flow: 12, airRequirement: 16 },
  { purity: 99, flow: 16, airRequirement: 21 },
  { purity: 99, flow: 23, airRequirement: 30 },
  { purity: 99, flow: 35, airRequirement: 45 },
  { purity: 99, flow: 46, airRequirement: 60 },
  { purity: 99, flow: 54, airRequirement: 70 },
  { purity: 99, flow: 59, airRequirement: 77 },
  { purity: 99, flow: 73, airRequirement: 94 },
  { purity: 99, flow: 83, airRequirement: 108 },
  { purity: 99, flow: 92, airRequirement: 119 },
  { purity: 99, flow: 103, airRequirement: 134 },
  { purity: 99, flow: 115, airRequirement: 149 },
  { purity: 99, flow: 127, airRequirement: 164 },
  { purity: 99, flow: 147, airRequirement: 190 },
  { purity: 99, flow: 166, airRequirement: 214 },
  { purity: 99, flow: 173, airRequirement: 224 },
  { purity: 99, flow: 205, airRequirement: 265 },
  { purity: 99, flow: 231, airRequirement: 299 },
  { purity: 99, flow: 254, airRequirement: 329 },
  { purity: 99, flow: 299, airRequirement: 387 },
  { purity: 99, flow: 314, airRequirement: 406 },
  { purity: 99, flow: 367, airRequirement: 476 },
  { purity: 99, flow: 418, airRequirement: 541 },
  { purity: 99, flow: 461, airRequirement: 597 },
  { purity: 99, flow: 531, airRequirement: 687 },
  { purity: 99, flow: 615, airRequirement: 796 },
  { purity: 99, flow: 692, airRequirement: 896 },
  { purity: 99, flow: 761, airRequirement: 986 },
  { purity: 99, flow: 923, airRequirement: 1195 },
  { purity: 99, flow: 1095, airRequirement: 1418 },
  { purity: 99, flow: 1154, airRequirement: 1494 },
  { purity: 99, flow: 1384, airRequirement: 1792 },
  { purity: 99, flow: 1644, airRequirement: 2129 },
  { purity: 99.5, flow: 7, airRequirement: 10 },
  { purity: 99.5, flow: 10, airRequirement: 15 },
  { purity: 99.5, flow: 14, airRequirement: 21 },
  { purity: 99.5, flow: 19, airRequirement: 29 },
  { purity: 99.5, flow: 29, airRequirement: 43 },
  { purity: 99.5, flow: 39, airRequirement: 58 },
  { purity: 99.5, flow: 45, airRequirement: 68 },
  { purity: 99.5, flow: 50, airRequirement: 74 },
  { purity: 99.5, flow: 61, airRequirement: 91 },
  { purity: 99.5, flow: 69, airRequirement: 104 },
  { purity: 99.5, flow: 77, airRequirement: 116 },
  { purity: 99.5, flow: 86, airRequirement: 130 },
  { purity: 99.5, flow: 97, airRequirement: 145 },
  { purity: 99.5, flow: 106, airRequirement: 159 },
  { purity: 99.5, flow: 123, airRequirement: 184 },
  { purity: 99.5, flow: 139, airRequirement: 208 },
  { purity: 99.5, flow: 145, airRequirement: 217 },
  { purity: 99.5, flow: 171, airRequirement: 257 },
  { purity: 99.5, flow: 193, airRequirement: 290 },
  { purity: 99.5, flow: 212, airRequirement: 319 },
  { purity: 99.5, flow: 250, airRequirement: 376 },
  { purity: 99.5, flow: 263, airRequirement: 394 },
  { purity: 99.5, flow: 307, airRequirement: 461 },
  { purity: 99.5, flow: 349, airRequirement: 524 },
  { purity: 99.5, flow: 386, airRequirement: 579 },
  { purity: 99.5, flow: 444, airRequirement: 666 },
  { purity: 99.5, flow: 514, airRequirement: 772 },
  { purity: 99.5, flow: 579, airRequirement: 869 },
  { purity: 99.5, flow: 637, airRequirement: 956 },
  { purity: 99.5, flow: 772, airRequirement: 1159 },
  { purity: 99.5, flow: 916, airRequirement: 1375 },
  { purity: 99.5, flow: 965, airRequirement: 1448 },
  { purity: 99.5, flow: 1158, airRequirement: 1738 },
  { purity: 99.5, flow: 1376, airRequirement: 2064 },
  { purity: 99.9, flow: 5, airRequirement: 9 },
  { purity: 99.9, flow: 8, airRequirement: 15 },
  { purity: 99.9, flow: 10, airRequirement: 19 },
  { purity: 99.9, flow: 14, airRequirement: 27 },
  { purity: 99.9, flow: 21, airRequirement: 41 },
  { purity: 99.9, flow: 29, airRequirement: 54 },
  { purity: 99.9, flow: 34, airRequirement: 64 },
  { purity: 99.9, flow: 37, airRequirement: 70 },
  { purity: 99.9, flow: 45, airRequirement: 85 },
  { purity: 99.9, flow: 52, airRequirement: 98 },
  { purity: 99.9, flow: 57, airRequirement: 109 },
  { purity: 99.9, flow: 64, airRequirement: 122 },
  { purity: 99.9, flow: 72, airRequirement: 136 },
  { purity: 99.9, flow: 79, airRequirement: 149 },
  { purity: 99.9, flow: 91, airRequirement: 173 },
  { purity: 99.9, flow: 103, airRequirement: 195 },
  { purity: 99.9, flow: 107, airRequirement: 204 },
  { purity: 99.9, flow: 127, airRequirement: 241 },
  { purity: 99.9, flow: 143, airRequirement: 271 },
  { purity: 99.9, flow: 158, airRequirement: 299 },
  { purity: 99.9, flow: 186, airRequirement: 352 },
  { purity: 99.9, flow: 195, airRequirement: 369 },
  { purity: 99.9, flow: 228, airRequirement: 432 },
  { purity: 99.9, flow: 259, airRequirement: 491 },
  { purity: 99.9, flow: 287, airRequirement: 543 },
  { purity: 99.9, flow: 329, airRequirement: 624 },
  { purity: 99.9, flow: 382, airRequirement: 723 },
  { purity: 99.9, flow: 430, airRequirement: 814 },
  { purity: 99.9, flow: 473, airRequirement: 896 },
  { purity: 99.9, flow: 573, airRequirement: 1086 },
  { purity: 99.9, flow: 680, airRequirement: 1288 },
  { purity: 99.9, flow: 716, airRequirement: 1357 },
  { purity: 99.9, flow: 860, airRequirement: 1629 },
  { purity: 99.9, flow: 1021, airRequirement: 1935 },
  { purity: 99.95, flow: 4, airRequirement: 10 },
  { purity: 99.95, flow: 7, airRequirement: 15 },
  { purity: 99.95, flow: 9, airRequirement: 20 },
  { purity: 99.95, flow: 13, airRequirement: 28 },
  { purity: 99.95, flow: 19, airRequirement: 43 },
  { purity: 99.95, flow: 26, airRequirement: 57 },
  { purity: 99.95, flow: 30, airRequirement: 67 },
  { purity: 99.95, flow: 33, airRequirement: 73 },
  { purity: 99.95, flow: 41, airRequirement: 89 },
  { purity: 99.95, flow: 46, airRequirement: 102 },
  { purity: 99.95, flow: 52, airRequirement: 114 },
  { purity: 99.95, flow: 58, airRequirement: 127 },
  { purity: 99.95, flow: 64, airRequirement: 142 },
  { purity: 99.95, flow: 71, airRequirement: 156 },
  { purity: 99.95, flow: 82, airRequirement: 181 },
  { purity: 99.95, flow: 93, airRequirement: 204 },
  { purity: 99.95, flow: 97, airRequirement: 213 },
  { purity: 99.95, flow: 114, airRequirement: 253 },
  { purity: 99.95, flow: 129, airRequirement: 285 },
  { purity: 99.95, flow: 142, airRequirement: 313 },
  { purity: 99.95, flow: 167, airRequirement: 369 },
  { purity: 99.95, flow: 175, airRequirement: 387 },
  { purity: 99.95, flow: 205, airRequirement: 453 },
  { purity: 99.95, flow: 233, airRequirement: 515 },
  { purity: 99.95, flow: 258, airRequirement: 569 },
  { purity: 99.95, flow: 296, airRequirement: 654 },
  { purity: 99.95, flow: 343, airRequirement: 758 },
  { purity: 99.95, flow: 387, airRequirement: 854 },
  { purity: 99.95, flow: 425, airRequirement: 939 },
  { purity: 99.95, flow: 516, airRequirement: 1138 },
  { purity: 99.95, flow: 612, airRequirement: 1350 },
  { purity: 99.95, flow: 645, airRequirement: 1423 },
  { purity: 99.95, flow: 774, airRequirement: 1707 },
  { purity: 99.95, flow: 919, airRequirement: 2028 },
  { purity: 99.99, flow: 3.0, airRequirement: 9.0 },
  { purity: 99.99, flow: 5.0, airRequirement: 14.0 },
  { purity: 99.99, flow: 7, airRequirement: 19.0 },
  { purity: 99.99, flow: 9, airRequirement: 27.0 },
  { purity: 99.99, flow: 14, airRequirement: 40.0 },
  { purity: 99.99, flow: 19, airRequirement: 54.0 },
  { purity: 99.99, flow: 22, airRequirement: 63.0 },
  { purity: 99.99, flow: 24, airRequirement: 69.0 },
  { purity: 99.99, flow: 30, airRequirement: 84.0 },
  { purity: 99.99, flow: 34, airRequirement: 97.0 },
  { purity: 99.99, flow: 38, airRequirement: 107.0 },
  { purity: 99.99, flow: 43, airRequirement: 120.0 },
  { purity: 99.99, flow: 48, airRequirement: 134.0 },
  { purity: 99.99, flow: 52, airRequirement: 148.0 },
  { purity: 99.99, flow: 60, airRequirement: 171.0 },
  { purity: 99.99, flow: 68, airRequirement: 193.0 },
  { purity: 99.99, flow: 71, airRequirement: 201.0 },
  { purity: 99.99, flow: 84, airRequirement: 238.0 },
  { purity: 99.99, flow: 95, airRequirement: 268.0 },
  { purity: 99.99, flow: 105, airRequirement: 295.0 },
  { purity: 99.99, flow: 123, airRequirement: 348.0 },
  { purity: 99.99, flow: 129, airRequirement: 365.0 },
  { purity: 99.99, flow: 151, airRequirement: 427.0 },
  { purity: 99.99, flow: 172, airRequirement: 486.0 },
  { purity: 99.99, flow: 190, airRequirement: 537.0 },
  { purity: 99.99, flow: 218, airRequirement: 617.0 },
  { purity: 99.99, flow: 253, airRequirement: 715.0 },
  { purity: 99.99, flow: 285, airRequirement: 805.0 },
  { purity: 99.99, flow: 314, airRequirement: 886.0 },
  { purity: 99.99, flow: 380, airRequirement: 1073.0 },
  { purity: 99.99, flow: 451, airRequirement: 1274.0 },
  { purity: 99.99, flow: 475, airRequirement: 1342.0 },
  { purity: 99.99, flow: 570, airRequirement: 1610.0 },
  { purity: 99.99, flow: 677, airRequirement: 1913.0 },
  { purity: 99.995, flow: 3.0, airRequirement: 10 },
  { purity: 99.995, flow: 5.0, airRequirement: 16 },
  { purity: 99.995, flow: 6, airRequirement: 22 },
  { purity: 99.995, flow: 8, airRequirement: 30 },
  { purity: 99.995, flow: 13, airRequirement: 45 },
  { purity: 99.995, flow: 17, airRequirement: 60 },
  { purity: 99.995, flow: 20, airRequirement: 71 },
  { purity: 99.995, flow: 22, airRequirement: 77 },
  { purity: 99.995, flow: 27, airRequirement: 95 },
  { purity: 99.995, flow: 31, airRequirement: 108 },
  { purity: 99.995, flow: 34, airRequirement: 120 },
  { purity: 99.995, flow: 38, airRequirement: 135 },
  { purity: 99.995, flow: 43, airRequirement: 150 },
  { purity: 99.995, flow: 47, airRequirement: 165 },
  { purity: 99.995, flow: 54, airRequirement: 191 },
  { purity: 99.995, flow: 61, airRequirement: 216 },
  { purity: 99.995, flow: 64, airRequirement: 226 },
  { purity: 99.995, flow: 76, airRequirement: 267 },
  { purity: 99.995, flow: 85, airRequirement: 301 },
  { purity: 99.995, flow: 94, airRequirement: 331 },
  { purity: 99.995, flow: 110, airRequirement: 390 },
  { purity: 99.995, flow: 116, airRequirement: 409 },
  { purity: 99.995, flow: 136, airRequirement: 479 },
  { purity: 99.995, flow: 154, airRequirement: 545 },
  { purity: 99.995, flow: 170, airRequirement: 602 },
  { purity: 99.995, flow: 196, airRequirement: 692 },
  { purity: 99.995, flow: 227, airRequirement: 801 },
  { purity: 99.995, flow: 256, airRequirement: 903 },
  { purity: 99.995, flow: 281, airRequirement: 993 },
  { purity: 99.995, flow: 341, airRequirement: 1203 },
  { purity: 99.995, flow: 404, airRequirement: 1428 },
  { purity: 99.995, flow: 426, airRequirement: 1504 },
  { purity: 99.995, flow: 511, airRequirement: 1805 },
  { purity: 99.995, flow: 607, airRequirement: 2144 },
  { purity: 99.999, flow: 2.0, airRequirement: 11.0 },
  { purity: 99.999, flow: 3.0, airRequirement: 16.0 },
  { purity: 99.999, flow: 5.0, airRequirement: 22.0 },
  { purity: 99.999, flow: 6, airRequirement: 30.0 },
  { purity: 99.999, flow: 10, airRequirement: 45.0 },
  { purity: 99.999, flow: 13, airRequirement: 60.0 },
  { purity: 99.999, flow: 15, airRequirement: 71.0 },
  { purity: 99.999, flow: 16, airRequirement: 77.0 },
  { purity: 99.999, flow: 20, airRequirement: 95.0 },
  { purity: 99.999, flow: 23, airRequirement: 109.0 },
  { purity: 99.999, flow: 26, airRequirement: 121.0 },
  { purity: 99.999, flow: 29, airRequirement: 135.0 },
  { purity: 99.999, flow: 32, airRequirement: 151.0 },
  { purity: 99.999, flow: 35, airRequirement: 166.0 },
  { purity: 99.999, flow: 41, airRequirement: 192.0 },
  { purity: 99.999, flow: 46, airRequirement: 217.0 },
  { purity: 99.999, flow: 48, airRequirement: 226.0 },
  { purity: 99.999, flow: 57, airRequirement: 268.0 },
  { purity: 99.999, flow: 64, airRequirement: 302.0 },
  { purity: 99.999, flow: 70, airRequirement: 332.0 },
  { purity: 99.999, flow: 83, airRequirement: 391.0 },
  { purity: 99.999, flow: 87, airRequirement: 410.0 },
  { purity: 99.999, flow: 102, airRequirement: 480.0 },
  { purity: 99.999, flow: 116, airRequirement: 546.0 },
  { purity: 99.999, flow: 128, airRequirement: 603.0 },
  { purity: 99.999, flow: 147, airRequirement: 694.0 },
  { purity: 99.999, flow: 171, airRequirement: 804.0 },
  { purity: 99.999, flow: 192, airRequirement: 905.0 },
  { purity: 99.999, flow: 211, airRequirement: 996.0 },
  { purity: 99.999, flow: 256, airRequirement: 1207.0 },
  { purity: 99.999, flow: 304, airRequirement: 1432.0 },
  { purity: 99.999, flow: 320, airRequirement: 1509.0 },
  { purity: 99.999, flow: 385, airRequirement: 1810.0 },
   { purity: 99.999, flow: 457, airRequirement: 2150.0 }
];

export  const OXYGEN_FLOW_DATA: FlowData[] = [
  { purity: 95, flow: 1.6, airRequirement: 12 },
  { purity: 95, flow: 2, airRequirement: 16 },
  { purity: 95, flow: 3, airRequirement: 21 },
  { purity: 95, flow: 4, airRequirement: 32 },
  { purity: 95, flow: 5.6, airRequirement: 43 },
  { purity: 95, flow: 6.5, airRequirement: 53 },
  { purity: 95, flow: 7.6, airRequirement: 58 },
  { purity: 95, flow: 9, airRequirement: 71 },
  { purity: 95, flow: 12.5, airRequirement: 101 },
  { purity: 95, flow: 15, airRequirement: 115 },
  { purity: 95, flow: 18, airRequirement: 139 },
  { purity: 95, flow: 22, airRequirement: 171 },
  { purity: 95, flow: 25, airRequirement: 208 },
  { purity: 95, flow: 30, airRequirement: 254 },
  { purity: 95, flow: 40, airRequirement: 315 },
  { purity: 95, flow: 45, airRequirement: 360 },
  { purity: 95, flow: 50, airRequirement: 394 },
  { purity: 95, flow: 65, airRequirement: 520 },
  { purity: 95, flow: 75, airRequirement: 602 },
  { purity: 95, flow: 90, airRequirement: 746 },
  { purity: 95, flow: 110, airRequirement: 890 },
  { purity: 95, flow: 130, airRequirement: 1040 },
  { purity: 95, flow: 150, airRequirement: 1211 },
  { purity: 95, flow: 200, airRequirement: 1610 },
  { purity: 95, flow: 250, airRequirement: 1911 }
];  

export const INTEREST_RATES = [0, 6, 7, 8, 9, 10, 11, 12] as const;

export const DEPRECIATION_RATES = [0, 5, 10, 15, 20] as const;
 
