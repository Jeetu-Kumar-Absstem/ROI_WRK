export const fmtINR = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;
export const fmtLakh = (value: number) => `₹${(value / 100000).toFixed(1)}L`;
export const fmtPct = (value: number) => `${value.toFixed(1)}%`;
export const n2f = (value: string | number | null | undefined, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const fmtK = (value: number) => `₹${(value / 1000).toFixed(1)}K`;


export const formatNumber = (num: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};