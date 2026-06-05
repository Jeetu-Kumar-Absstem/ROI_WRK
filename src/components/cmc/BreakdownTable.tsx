import type { ReactNode } from 'react';

export type BreakdownRow = {
  label: string;
  current: ReactNode;
  cmc: ReactNode;
  section?: boolean;
};

type BreakdownTableProps = {
  rows: BreakdownRow[];
};

export default function BreakdownTable({ rows }: BreakdownTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
              Item
            </th>
            <th className="border-b border-slate-200 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
              Current
            </th>
            <th className="border-b border-slate-200 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
              Under CMC
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.label}-${index}`} className={row.section ? 'bg-slate-50' : ''}>
              <td className={`border-b border-slate-100 px-3 py-2 ${row.section ? 'font-bold text-[#1F4E79]' : 'font-normal text-slate-700'}`}>
                {row.label}
              </td>
              <td className={`border-b border-slate-100 px-3 py-2 text-right ${row.section ? 'font-bold text-[#1F4E79]' : 'font-normal text-slate-700'}`}>
                {row.current}
              </td>
              <td className={`border-b border-slate-100 px-3 py-2 text-right ${row.section ? 'font-bold text-[#1F4E79]' : 'font-normal text-slate-700'}`}>
                {row.cmc}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
