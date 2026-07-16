import { useState } from 'react';
import CMCCalculator1 from './Calculator1';
import CMCCalculator2 from './Calculator2';

type CalcTab = 'calculator_1' | 'calculator_2';

const CALC_TABS: Array<{ id: CalcTab; label: string }> = [
  { id: 'calculator_1', label: 'Calculator 1 — Existing Maintenance vs Absstem Shield Premium' },
  { id: 'calculator_2', label: 'Calculator 2 — Repair / Revamp vs Buying Oxygen' },
];

export default function CmcApp() {
  const [activeCalc, setActiveCalc] = useState<CalcTab>('calculator_1');

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-200 print:hidden">
        <nav
          aria-label="CMC calculators"
          className="flex flex-wrap gap-6 overflow-x-auto whitespace-nowrap"
          data-cmc-calculator-tabs
        >
          {CALC_TABS.map((tab) => {
            const active = activeCalc === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCalc(tab.id)}
                className={`-mb-px border-b-[3px] py-4 text-[14px] transition ${
                  active
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {activeCalc === 'calculator_1' ? <CMCCalculator1 /> : <CMCCalculator2 />}
    </div>
  );
}
