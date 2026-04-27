export const getLiquidToGasConversionFactor = (unit: string, gasType: 'nitrogen' | 'oxygen'): number => {
  if (gasType === 'nitrogen') {
    switch (unit) {
      case 'Sm3': return 0.9478;
      case 'Nm3': return 1;
      case 'Liters': return 0.646;
      case 'Kg': return 0.8;
      default: return 1;
    }
  } else { // oxygen
    switch (unit) {
      case 'Sm3': return 0.9478;
      case 'Nm3': return 1;
      case 'Liters': return 0.7;
      case 'Kg': return 0.7;
      default: return 1;
    }
  }
};

export const convertToNm3 = (cost: number, unit: string, gasType: 'nitrogen' | 'oxygen'): number => {
  if (gasType === 'nitrogen') {
    switch (unit) {
      case 'Sm3': return cost * 1.055;
      case 'Nm3': return cost;
      case 'Liters': return cost / 0.646;
      case 'Kg': return cost / 0.8;
      default: return cost;
    }
  } else { // oxygen
    switch (unit) {
      case 'Sm3': return cost * 1.055;
      case 'Nm3': return cost;
      case 'Liters': return cost / 0.7;
      case 'Kg': return cost / 0.7;
      default: return cost;
    }
  }
};
 