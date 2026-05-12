export const formatIndianCurrency = (amount: number): string => {
  const prefix = amount < 0 ? '-₹' : '₹';
  const absoluteAmount = Math.abs(amount);

  return `${prefix}${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absoluteAmount)}/-`;
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

export const formatLoadFactor = (value: number): string => formatNumber(value, 2);
 
export const getISTDateTimeForFilename = (): string => {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || '';
  const dateStr = `${get('day')}.${get('month')}.${get('year')}`; // DD.MM.YYYY
  const timeStr = `${get('hour')}.${get('minute')}.${get('second')}`; // HH.MM.SS
  return `${dateStr}-${timeStr}`;
};
 
