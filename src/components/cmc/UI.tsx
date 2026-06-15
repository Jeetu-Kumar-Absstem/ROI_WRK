import type { InputHTMLAttributes, ReactNode } from 'react';

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {title ? <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{title}</p> : null}
      {children}
    </div>
  );
}

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Field({ label, hint, children, className = '' }: FieldProps) {
  return (
    <div className={`mb-3 ${className}`}>
      <label className="mb-1 block text-[15px] text-slate-600">{label}</label>
      {children}
      {hint ? <div className="mt-1 text-[11px] text-slate-400">{hint}</div> : null}
    </div>
  );
}

type MetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  color?: string;
};

export function MetricCard({ label, value, color = 'var(--text)' }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="mb-1 text-xs text-slate-500">{label}</div>
      <div className="text-[20px] font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

type VerdictType = 'save' | 'warn' | 'loss';

const VERDICT_THEMES: Record<VerdictType, { bg: string; color: string; border: string }> = {
  save: { bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
  warn: { bg: '#FAEEDA', color: '#633806', border: '#EF9F27' },
  loss: { bg: '#FCEBEB', color: '#791F1F', border: '#F09595' },
};

type VerdictProps = {
  type?: VerdictType;
  children: ReactNode;
};

export function Verdict({ type = 'save', children }: VerdictProps) {
  const theme = VERDICT_THEMES[type];
  return (
    <div
      className="mb-6 rounded-2xl border px-4 py-3 text-[14px] font-medium leading-6"
      style={{ background: theme.bg, color: theme.color, borderColor: theme.border }}
    >
      {children}
    </div>
  );
}

type DerivedBoxProps = {
  children: ReactNode;
  className?: string;
};

export function DerivedBox({ children, className = '' }: DerivedBoxProps) {
  return <div className={`mb-4 rounded-md bg-slate-50 px-3 py-2 text-[12px] leading-7 text-slate-500 ${className}`}>{children}</div>;
}

type SectionPillProps = {
  label: string;
};

export function SectionPill({ label }: SectionPillProps) {
  return (
    <div className="mb-3 inline-block rounded bg-[#1F4E79] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.07em] text-white">
      {label}
    </div>
  );
}

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> & {
  value: number | string;
  onChange?: (value: string) => void;
};

const INVALID_NUMBER_KEYS = new Set(['-', '+', 'e', 'E']);

export function NumberInput({ value, onChange, ...rest }: NumberInputProps) {
  return (
    <input
      type="number"
      value={value}
      inputMode="decimal"
      onKeyDown={(event) => {
        if (INVALID_NUMBER_KEYS.has(event.key)) {
          event.preventDefault();
        }
      }}
      onChange={(event) => {
        if (rest.readOnly) {
          return;
        }
        const parsed = Number.parseFloat(event.target.value);
        onChange?.(String(Number.isFinite(parsed) ? Math.max(0, parsed) : 0));
      }}
      {...rest}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${rest.className ?? ''}`}
    />
  );
}

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  onChange?: (value: string) => void;
};

export function TextInput({ onChange, ...rest }: TextInputProps) {
  return (
    <input
      type="text"
      {...rest}
      onChange={(event) => onChange?.(event.target.value)}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 ${rest.className ?? ''}`}
    />
  );
}
