import type { ReactNode } from 'react';

export type BreakdownRow = {
  label: string;
  current: ReactNode;
  cmc: ReactNode;
  section?: boolean;
  isTotalSavings?: boolean; // New flag for total savings row
};

type BreakdownTableProps = {
  rows: BreakdownRow[];
};

export default function BreakdownTable({ rows }: BreakdownTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[15px]">
        <thead>
          <tr>
            <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-black-500 bg-rose-200">
              Item
            </th>
            <th className="border-b border-slate-200 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-black-500 bg-rose-200">
              Current
            </th>
            <th className="border-b border-slate-200 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-black-500 bg-rose-200">
              Under CMC
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr 
              key={`${row.label}-${index}`} 
              className={
                row.isTotalSavings 
                  ? 'bg-green-100' 
                  : row.section 
                    ? 'bg-blue-100' 
                    : index % 2 === 0 
                      ? 'bg-white' 
                      : 'bg-slate-50'
              }
            >
              <td className={`border-b border-slate-100 px-3 py-2 ${
                row.isTotalSavings 
                  ? 'font-bold text-green-700' 
                  : row.section 
                    ? 'font-bold text-[#1F4E79]' 
                    : 'font-normal text-slate-700'
              }`}>
                {row.label}
              </td>
              <td className={`border-b border-slate-100 px-3 py-2 text-right ${
                row.isTotalSavings 
                  ? 'font-bold text-green-700' 
                  : row.section 
                    ? 'font-bold text-[#1F4E79]' 
                    : 'font-normal text-slate-700'
              }`}>
                {row.isTotalSavings && row.current !== '—' && row.current !== '' 
                  ? row.current 
                  : row.current}
              </td>
              <td className={`border-b border-slate-100 px-3 py-2 text-right ${
                row.isTotalSavings 
                  ? 'font-bold text-green-700' 
                  : row.section 
                    ? 'font-bold text-[#1F4E79]' 
                    : 'font-normal text-slate-700'
              }`}>
                {row.isTotalSavings && row.cmc !== '—' && row.cmc !== '' 
                  ? row.cmc 
                  : row.cmc}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}