import type { ReactNode } from 'react';

type PrintMeta = {
  client: string;
  by: string;
  plant: string;
};

type PrintHeaderProps = {
  meta: PrintMeta;
  title: string;
  subtitle: string;
  rightLine?: ReactNode;
};

export default function PrintHeader({ meta, title, subtitle, rightLine }: PrintHeaderProps) {
  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  return (
    <div className="print-only mb-5 border-b-2 border-[#1F4E79] pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[18px] font-bold text-[#1F4E79]">{title}</div>
          <div className="mt-1 text-[13px] text-slate-500">{subtitle}</div>
        </div>
        <div className="text-right text-[12px] text-slate-500">
          <div>Date: {dateStr}</div>
          <div>Absstem Technologies LLP</div>
          {rightLine ? <div>{rightLine}</div> : <div>medo@absstem.com | 1800 3010 3394</div>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[13px] text-slate-500">
        {meta.client ? (
          <span>
            <strong>{meta.client}</strong>
          </span>
        ) : null}
        {meta.plant ? (
          <span>
            Plant: <strong>{meta.plant}</strong>
          </span>
        ) : null}
        {meta.by ? (
          <span>
            Prepared by: <strong>{meta.by}</strong>
          </span>
        ) : null}
      </div>
    </div>
  );
}
