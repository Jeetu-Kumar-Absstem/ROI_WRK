/**
 * Format a number to Indian numbering system (with commas)
 * @param num The number to format
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted string with Indian numbering system
 */
export function formatIndianNumber(num: number, decimals: number = 0): string {
  if (num === 0) return '0';

  const sign = num < 0 ? '-' : '';
  num = Math.abs(num);

  const integerStr = Math.floor(num).toString();
  let lastThree = integerStr.slice(-3);
  let otherNumbers = integerStr.slice(0, -3);
  let result = lastThree;

  while (otherNumbers.length > 0) {
    result = otherNumbers.slice(-2) + ',' + result;
    otherNumbers = otherNumbers.slice(0, -2);
  }

  const decimalPart = decimals > 0 ? '.' + num.toFixed(decimals).split('.')[1] : '';

  return sign + result + decimalPart;
}
 