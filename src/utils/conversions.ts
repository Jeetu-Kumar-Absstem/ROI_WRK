const normalizeVolumeUnit = (unit: string): string => {
  switch (unit) {
    case 'Sm³':
    case 'SmÂ³':
      return 'Sm3';
    case 'Nm³':
    case 'NmÂ³':
      return 'Nm3';
    default:
      return unit;
  }
};

export const getLiquidToGasConversionFactor = (unit: string, gasType: 'nitrogen' | 'oxygen'): number => {
  const normalizedUnit = normalizeVolumeUnit(unit);

  if (gasType === 'nitrogen') {
    switch (normalizedUnit) {
      case 'Sm3': return 0.9478;
      case 'Nm3': return 1;
      case 'Liters': return 0.646;
      case 'Kg': return 0.8;
      default: return 1;
    }
  } else { // oxygen
    switch (normalizedUnit) {
      case 'Sm3': return 0.9478;
      case 'Nm3': return 1;
      case 'Liters': return 0.7;
      case 'Kg': return 0.7;
      default: return 1;
    }
  }
};

export const convertToNm3 = (cost: number, unit: string, gasType: 'nitrogen' | 'oxygen'): number => {
  const normalizedUnit = normalizeVolumeUnit(unit);

  if (gasType === 'nitrogen') {
    switch (normalizedUnit) {
      case 'Sm3': return cost * 1.055;
      case 'Nm3': return cost;
      case 'Liters': return cost / 0.646;
      case 'Kg': return cost / 0.8;
      default: return cost;
    }
  } else { // oxygen
    switch (normalizedUnit) {
      case 'Sm3': return cost * 1.055;
      case 'Nm3': return cost;
      case 'Liters': return cost / 0.7;
      case 'Kg': return cost / 0.7;
      default: return cost;
    }
  }
};
 
