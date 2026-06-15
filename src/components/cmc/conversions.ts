// src/components/cmc/conversions.ts

export type GasType = 'oxygen';
export type VolumeUnit = 'Nm3' | 'Sm3' | 'Liters' | 'Kg';

const normalizeVolumeUnit = (unit: string): VolumeUnit => {
  switch (unit) {
    case 'Sm³':
    case 'SmÂ³':
    case 'Sm3':
      return 'Sm3';

    case 'Nm³':
    case 'NmÂ³':
    case 'Nm3':
      return 'Nm3';

    case 'Liters':
    case 'L':
    case 'l':
      return 'Liters';

    case 'Kg':
    case 'kg':
    case 'KG':
      return 'Kg';

    default:
      return 'Nm3';
  }
};

// Match the logic from your original file:
// Sm3 -> Nm3 = 0.9478
// Nm3 -> Sm3 = 1.055

const toNm3Factors: Record<VolumeUnit, number> = {
  Nm3: 1,
  Sm3: 0.9478,
  Liters:  0.7,
  Kg: 0.7,
};

const fromNm3Factors: Record<VolumeUnit, number> = {
  Nm3: 1,
  Sm3: 1.055,
  Liters: 0.7,
  Kg: 0.7,
};

export const convertToNm3 = (
  value: number,
  fromUnit: VolumeUnit
): number => {
  const normalizedUnit = normalizeVolumeUnit(fromUnit);
  return value * toNm3Factors[normalizedUnit];
};

export const convertFromNm3 = (
  value: number,
  toUnit: VolumeUnit
): number => {
  const normalizedUnit = normalizeVolumeUnit(toUnit);
  return value * fromNm3Factors[normalizedUnit];
};

export const getUnitDisplay = (unit: VolumeUnit): string => {
  switch (unit) {
    case 'Nm3':
      return 'Nm³';

    case 'Sm3':
      return 'Sm³';

    case 'Liters':
      return 'Liters';

    case 'Kg':
      return 'Kg';

    default:
      return unit;
  }
};

export const getUnitSuperscript = (unit: VolumeUnit): string => {
  switch (unit) {
    case 'Nm3':
      return 'Nm³';

    case 'Sm3':
      return 'Sm³';

    default:
      return unit;
  }
};