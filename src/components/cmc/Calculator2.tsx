import { useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DownloadPdfButton from '../DownloadPdfButton';
import { ReportLayout } from '../ReportLayout';
import { Card, DerivedBox, Field, MetricCard, NumberInput, TextInput, Verdict } from './UI';
import { fmtINR, fmtLakh, n2f } from './format';

const fmtCost = (v: number) => `${fmtINR(v)}/-`;

type Mode = 'cylinder' | 'liquid';
type CostMode = 'new' | 'repair';
type PrintMeta = {
  client: string;
  by: string;
  plant: string;
};

const OXY_MODES: Record<
  Mode,
  {
    col1Title: string;
    qtyLabel: string;
    qtyHint: string;
    gpuLabel: string;
    gpuHint: string;
    ucLabel: string;
    ucHint: string;
    qtyDef: number;
    gpuDef: number;
    ucDef: number;
  }
> = {
  cylinder: {
    col1Title: 'Current oxygen purchase — Cylinders',
    qtyLabel: 'Cylinders consumed per day',
    qtyHint: 'Average actual cylinders used per day',
    gpuLabel: 'Gas per cylinder (m³)',
    gpuHint: 'Standard cylinder ~6.5 m³ (7 m³ water capacity)',
    ucLabel: 'Cost per cylinder ₹',
    ucHint: 'Incl. cylinder rent, delivery, demurrage (excl. GST)',
    qtyDef: 70,
    gpuDef: 6.5,
    ucDef: 230,
  },
  liquid: {
    col1Title: 'Current oxygen purchase — Liquid Oxygen',
    qtyLabel: 'Liquid oxygen tanks per day',
    qtyHint: 'Average actual tanks consumed per day (can be fractional)',
    gpuLabel: 'Gas per tank (m³)',
    gpuHint: 'Standard LOX tank ~185 m³ (185 L liquid)',
    ucLabel: 'Cost per LOX tank ₹',
    ucHint: 'Per cryogenic tanker / dewar delivery charge',
    qtyDef: 1.5,
    gpuDef: 185,
    ucDef: 35000,
  },
};

function sanitizeNonNegative(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}

export default function CMCCalculator2() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [meta, setMeta] = useState<PrintMeta>({ client: '', by: '', plant: '' });
  const [mode, setMode] = useState<Mode>('cylinder');
  const [oxyQty, setOxyQty] = useState(OXY_MODES.cylinder.qtyDef);
  const [gpu, setGpu] = useState(OXY_MODES.cylinder.gpuDef);
  const [unitCost, setUnitCost] = useState(OXY_MODES.cylinder.ucDef);
  const [oxyEsc, setOxyEsc] = useState(7);
  const [plantFlow, setPlantFlow] = useState(30);
  const [powerPerM3, setPowerPerM3] = useState(1.1);
  const [elecRate, setElecRate] = useState(8);
  const [costMode, setCostMode] = useState<CostMode>('new');
  const [plantCost, setPlantCost] = useState(4599820);
  const [cmcYr, setCmcYr] = useState(425000);
  const [plantLife, setPlantLife] = useState(10);

  const ml = OXY_MODES[mode];

  const calculations = useMemo(() => {
    const qty = n2f(oxyQty);
    const gv = n2f(gpu);
    const uc = n2f(unitCost);
    const pf = n2f(plantFlow);
    const ppm = n2f(powerPerM3);
    const er = n2f(elecRate);
    const pc = n2f(plantCost);
    const cmc = n2f(cmcYr);
    const life = Math.max(1, Math.round(n2f(plantLife)));
    const esc = n2f(oxyEsc) / 100;

    const gasPerDay = qty * gv;
    const gasPerMonth = gasPerDay * 30;
    const gasPerHr = gasPerDay / 24;
    const oxyMonthCost = qty * uc * 30;
    const unitPriceOxy = gasPerMonth > 0 ? oxyMonthCost / gasPerMonth : 0;
    const totalPowerKW = pf * ppm;
    const elecPerMonth = gasPerMonth * er;
    const unitPricePSA = ppm * er;
    const savingPerM3 = unitPriceOxy - unitPricePSA;
    const monthlySaving = savingPerM3 * gasPerMonth;
    const yearlySaving = monthlySaving * 12;
    const cmcTotal = cmc * (life - 1);
    const roiYears = yearlySaving > 0 ? pc / yearlySaving : Infinity;
    const roiMonths = roiYears * 12;
    const totalSaving = yearlySaving * life - cmcTotal - pc;
    const roiLabel = Number.isFinite(roiYears)
      ? roiYears < 1
        ? `${roiMonths.toFixed(2)} months`
        : `${roiYears.toFixed(2)} years`
      : 'N/A';
    const roiSheetValue = Number.isFinite(roiYears)
      ? roiYears < 1
        ? roiMonths.toFixed(2)
        : roiYears.toFixed(4)
      : 'N/A';
    const roiSheetUnit = Number.isFinite(roiYears) ? (roiYears < 1 ? 'Months' : 'Years') : 'N/A';

    const yLabels = ['Now'];
    const buyCumul = [0];
    const psaCumul = [pc];
    let buySum = 0;
    let psaSum = pc;

    for (let year = 1; year <= life; year += 1) {
      yLabels.push(`Yr ${year}`);
      const oxyThis = oxyMonthCost * 12 * Math.pow(1 + esc, year - 1);
      buySum += oxyThis;
      psaSum += elecPerMonth * 12 + (year === 1 ? 0 : cmc);
      buyCumul.push(Math.round(buySum));
      psaCumul.push(Math.round(psaSum));
    }

    const verdictType = totalSaving >= 0 ? 'save' : 'loss';
    const verdictText =
      totalSaving >= 0
        ? `PSA plant can save ${fmtCost(monthlySaving)} per month. Over ${life} years, the projected total saving is ${fmtCost(totalSaving)}.`
        : `Over ${life} years, buying oxygen is cheaper by ${fmtCost(Math.abs(totalSaving))}. Review inputs.`;

    return {
      qty,
      gv,
      uc,
      pf,
      ppm,
      er,
      pc,
      cmc,
      life,
      esc,
      gasPerDay,
      gasPerMonth,
      gasPerHr,
      oxyMonthCost,
      unitPriceOxy,
      totalPowerKW,
      elecPerMonth,
      unitPricePSA,
      savingPerM3,
      monthlySaving,
      yearlySaving,
      cmcTotal,
      roiYears,
      roiMonths,
      totalSaving,
      yLabels,
      buyCumul,
      psaCumul,
      roiLabel,
      roiSheetValue,
      roiSheetUnit,
      verdictType,
      verdictText,
      lineChartData: yLabels.map((label, index) => ({
        label,
        buy: buyCumul[index],
        psa: psaCumul[index],
      })),
      barData: [
        { name: 'Monthly oxygen cost', value: oxyMonthCost },
        { name: 'Monthly electricity', value: elecPerMonth },
        { name: 'Monthly saving', value: monthlySaving },
      ],
      costMode,
    };
  }, [cmcYr, elecRate, gpu, oxyEsc, oxyQty, plantCost, plantFlow, plantLife, powerPerM3, unitCost, costMode]);

  const reportSummary = (
    <p className="text-justify">
      This report compares buying oxygen externally against a PSA plant, and includes the investment and CMC impact over plant life.
      The calculation mirrors the Excel-style logic used in the reference CMC calculator, including monthly savings, ROI period and cumulative cost.
    </p>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-normal text-slate-900">
      <div className="mb-4 flex justify-end print:hidden">
        <DownloadPdfButton
          contentToPrint={reportRef}
          tabName="CMC_CALCULATOR_2"
          inputs={{
            meta,
            mode,
            oxyQty,
            gpu,
            unitCost,
            oxyEsc,
            plantFlow,
            powerPerM3,
            elecRate,
            costMode,
            plantCost,
            cmcYr,
            plantLife,
          }}
        />
      </div>

      <div className="space-y-6 print:hidden">
        <p className="text-[19px] font-bold text-[#1F4E79]">Plant / Revamp vs Buying Oxygen</p>
        <p className="text-[13px] text-slate-500">
          Based on Absstem&apos;s ROI logic. It calculates monthly saving, ROI period and total saving over the plant life.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('cylinder');
              setOxyQty(OXY_MODES.cylinder.qtyDef);
              setGpu(OXY_MODES.cylinder.gpuDef);
              setUnitCost(OXY_MODES.cylinder.ucDef);
            }}
            className={`rounded-lg border px-4 py-2 text-[14px] transition ${
              mode === 'cylinder' ? 'border-[#1F4E79] bg-[#1F4E79] text-white' : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            🫙 vs Cylinders
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('liquid');
              setOxyQty(OXY_MODES.liquid.qtyDef);
              setGpu(OXY_MODES.liquid.gpuDef);
              setUnitCost(OXY_MODES.liquid.ucDef);
            }}
            className={`rounded-lg border px-4 py-2 text-[14px] transition ${
              mode === 'liquid' ? 'border-[#1F4E79] bg-[#1F4E79] text-white' : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            🧊 vs Liquid Oxygen
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card title={ml.col1Title} className="bg-white">
            <Field label={ml.qtyLabel} hint={ml.qtyHint}>
              <NumberInput value={oxyQty} min={0} step={mode === 'cylinder' ? 5 : 0.5} onChange={(value) => setOxyQty(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label={ml.gpuLabel} hint={ml.gpuHint}>
              <NumberInput value={gpu} min={0} step={0.5} onChange={(value) => setGpu(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label={ml.ucLabel} hint={ml.ucHint}>
              <NumberInput value={unitCost} min={0} step={mode === 'cylinder' ? 10 : 500} onChange={(value) => setUnitCost(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="Annual oxygen price escalation (%)" hint="Typical 5–10% per year">
              <NumberInput value={oxyEsc} min={0} max={30} step={1} onChange={(value) => setOxyEsc(sanitizeNonNegative(value, 0))} />
            </Field>
            <DerivedBox>
              <div>
                Gas used/day: <strong className="text-slate-700">{calculations.gasPerDay.toFixed(1)} m³</strong>
              </div>
              <div>
                Gas used/month: <strong className="text-slate-700">{calculations.gasPerMonth.toFixed(0)} m³</strong>
              </div>
              <div>
                Unit price: <strong className="text-[#A32D2D]">{fmtINR(calculations.unitPriceOxy)}/m³</strong>
              </div>
            </DerivedBox>
          </Card>

          <Card title="PSA plant specifications" className="bg-white">
            <Field label="PSA plant flow rate (m³/hr)" hint="Rated output capacity of the plant">
              <NumberInput value={plantFlow} min={0} step={5} onChange={(value) => setPlantFlow(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="Power per m³ of oxygen produced (kW)" hint="Typically 1.0–1.2 kW/m³ for PSA plants">
              <NumberInput value={powerPerM3} min={0} max={3} step={0.1} onChange={(value) => setPowerPerM3(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="Total plant power draw (kW) — auto" hint="Auto-calculated = flow × kW/m³">
              <NumberInput value={calculations.totalPowerKW.toFixed(1)} readOnly />
            </Field>
            <Field label="Electricity cost ₹ per kWh (unit)">
              <NumberInput value={elecRate} min={0} max={25} step={0.5} onChange={(value) => setElecRate(sanitizeNonNegative(value, 0))} />
            </Field>
            <DerivedBox>
              <div>
                Electricity/month: <strong className="text-slate-700">{fmtCost(calculations.elecPerMonth)}</strong>
              </div>
              <div>
                PSA unit price: <strong className="text-[#3B6D11]">{fmtCost(calculations.unitPricePSA)}/m³</strong>
              </div>
              <div>
                Saving per m³: <strong className="text-[#3B6D11]">{fmtCost(calculations.savingPerM3)}</strong>
              </div>
            </DerivedBox>
          </Card>

          <Card title="Plant investment & CMC" className="bg-white">
            <Field label="Cost type">
              <select
                value={costMode}
                onChange={(event) => setCostMode(event.target.value as CostMode)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              >
                <option value="new">New plant purchase</option>
                <option value="repair">Repair / revamp of existing plant</option>
              </select>
            </Field>
            <Field label={costMode === 'new' ? 'Plant purchase cost ₹ (ex-GST)' : 'Repair / restoration cost ₹'} hint={costMode === 'new' ? 'Ex-factory price excluding GST' : 'Labour + spares for complete restoration'}>
              <NumberInput value={plantCost} min={0} step={50000} onChange={(value) => setPlantCost(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="CMC charges per year ₹ (ex-GST)" hint="Absstem Shield Premium CMC annual value">
              <NumberInput value={cmcYr} min={0} step={5000} onChange={(value) => setCmcYr(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="Plant life (years)" hint="Typically 10 years for a PSA plant">
              <NumberInput value={plantLife} min={1} max={20} step={1} onChange={(value) => setPlantLife(Math.max(1, sanitizeNonNegative(value, 1)))} />
            </Field>
            <DerivedBox>
              <div>
                CMC over {calculations.life} years: <strong className="text-slate-700">{fmtCost(calculations.cmcTotal)}</strong>
              </div>
            </DerivedBox>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard label="Monthly oxygen cost (current)" value={fmtCost(calculations.oxyMonthCost)} color="var(--red)" />
          <MetricCard label="Monthly electricity cost (PSA)" value={fmtCost(calculations.elecPerMonth)} color="var(--amber)" />
          <MetricCard label="Monthly saving by using PSA" value={fmtCost(calculations.monthlySaving)} color="var(--green)" />
          <MetricCard label="Yearly saving by using PSA" value={fmtCost(calculations.yearlySaving)} color="var(--green)" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard label="ROI period" value={calculations.roiLabel} color="var(--navy)" />
          <MetricCard label={`Total saving over ${calculations.life} years`} value={fmtCost(calculations.totalSaving)} color={calculations.totalSaving >= 0 ? 'var(--green)' : 'var(--red)'} />
          <MetricCard label={`CMC over ${calculations.life} years`} value={fmtCost(calculations.cmcTotal)} />
        </div>

        <Verdict type={calculations.totalSaving >= 0 ? 'save' : 'loss'}>{calculations.totalSaving >= 0 ? `PSA plant can save ${fmtCost(calculations.monthlySaving)} per month. Over ${calculations.life} years, the projected total saving is ${fmtCost(calculations.totalSaving)}.` : `Over ${calculations.life} years, buying oxygen is cheaper by ${fmtCost(Math.abs(calculations.totalSaving))}. Review inputs.`}</Verdict>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card title="Monthly cost comparison" className="bg-white">
            <div className="h-[260px]" >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calculations.barData} margin={{ top: 10, right:12, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => fmtLakh(Number(value))} width={78} />
                  <Tooltip formatter={(value: number) => fmtCost(value)} />
                  <Legend />
                  <Bar dataKey="value" name="Value" fill="#1F4E79" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Cumulative cost over plant life" className="bg-white">
            <div className="mb-3 flex flex-wrap gap-4 text-[12px] text-slate-500">
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#E24B4A]" />
                Buy oxygen
              </span>
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#3B6D11]" />
                PSA plant total
              </span>
            </div>
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.lineChartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => fmtLakh(Number(value))} width={78} />
                  <Tooltip formatter={(value: number) => fmtCost(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="buy" name="Buy oxygen" stroke="#E24B4A" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="psa" name="PSA plant" stroke="#3B6D11" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card title="Full calculation sheet" className="bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Parameter</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">UOM</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Value</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'OXYGEN PURCHASE (CURRENT)', uom: '', val: '', section: true },
                  { label: mode === 'cylinder' ? 'Oxygen cylinders per day' : 'Liquid oxygen tanks per day', uom: mode === 'cylinder' ? 'Nos' : 'Tanks', val: calculations.qty.toString() },
                  { label: mode === 'cylinder' ? 'Gas per cylinder' : 'Gas per tank', uom: 'm³', val: calculations.gv.toString() },
                  { label: 'Oxygen gas used / month', uom: 'm³', val: calculations.gasPerMonth.toFixed(0) },
                  { label: 'Per hour oxygen consumption', uom: 'm³/hr', val: calculations.gasPerHr.toFixed(3) },
                  { label: mode === 'cylinder' ? 'Cost per cylinder' : 'Cost per tank', uom: '₹', val: fmtCost(calculations.uc) },
                  { label: 'Unit price per m³ (current)', uom: '₹/m³', val: fmtCost(calculations.unitPriceOxy) },
                  { label: 'Monthly oxygen expense', uom: '₹', val: fmtCost(calculations.oxyMonthCost) },
                  { label: 'PSA OXYGEN PLANT', uom: '', val: '', section: true },
                  { label: 'PSA plant flow rate', uom: 'm³/hr', val: calculations.pf.toString() },
                  { label: 'Power per m³ produced', uom: 'kW', val: calculations.ppm.toString() },
                  { label: 'Electricity expense per month', uom: '₹', val: fmtCost(calculations.elecPerMonth) },
                  { label: 'Unit price per m³ (PSA)', uom: '₹/m³', val: fmtCost(calculations.unitPricePSA) },
                  { label: 'SAVINGS', uom: '', val: '', section: true },
                  { label: 'Monthly saving by using PSA', uom: '₹', val: fmtCost(calculations.monthlySaving) },
                  { label: 'Yearly saving by using PSA', uom: '₹', val: fmtCost(calculations.yearlySaving) },
                  { label: 'ROI & INVESTMENT', uom: '', val: '', section: true },
                  { label: calculations.costMode === 'new' ? 'Oxygen plant purchase cost' : 'Plant repair / restoration cost', uom: '₹', val: fmtCost(calculations.pc) },
                  { label: 'ROI period', uom: calculations.roiSheetUnit, val: calculations.roiSheetValue },
                  { label: 'Life of oxygen plant', uom: 'Years', val: calculations.life.toString() },
                  { label: 'CMC charges per year', uom: '₹', val: fmtCost(calculations.cmc) },
                  { label: `CMC charges for ${calculations.life} years`, uom: '₹', val: fmtCost(calculations.cmcTotal) },
                  { label: `Total saving in ${calculations.life} years`, uom: '₹', val: fmtCost(calculations.totalSaving), section: true },
                ].map((row, index) => (
                  <tr key={`${row.label}-${index}`} className={row.section ? 'bg-slate-50' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className={`border-b border-slate-100 px-3 py-2 ${row.section ? 'font-bold text-[#1F4E79]' : 'text-slate-700'}`}>{row.label}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-[12px] text-slate-500">{row.uom}</td>
                    <td className={`border-b border-slate-100 px-3 py-2 text-right ${row.section ? 'font-bold text-[#1F4E79]' : 'text-slate-700'}`}>{row.val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="print:hidden">
        <ReportLayout
          ref={reportRef}
          title="Plant / Revamp vs Buying Oxygen"
          summary={reportSummary}
          pageOneContent={
            <div className="space-y-6">
              {/* <Card title="Input Parameters" className="bg-white">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-2 text-slate-500">Client / Hospital name</div>
                    <div className="text-lg font-bold text-slate-900">{meta.client || '—'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-2 text-slate-500">Prepared by</div>
                    <div className="text-lg font-bold text-slate-900">{meta.by || '—'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-2 text-slate-500">Plant / Location</div>
                    <div className="text-lg font-bold text-slate-900">{meta.plant || '—'}</div>
                  </div>
                </div>
              </Card> */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card title="Current oxygen purchase" className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="space-y-2 text-[13px] text-slate-700">
                    <div className="flex items-start justify-between gap-4">
                      <span>Gas used/month</span>
                      <span>{calculations.gasPerMonth.toFixed(0)} m³</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>Monthly oxygen expense</span>
                      <span>{fmtCost(calculations.oxyMonthCost)}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>Unit price</span>
                      <span>{fmtCost(calculations.unitPriceOxy)}/m³</span>
                    </div>
                  </div>
                </Card>
                <Card title="PSA plant specifications" className="border-slate-200 bg-white">
                  <div className="space-y-2 text-[13px] text-slate-700">
                    <div className="flex items-start justify-between gap-4">
                      <span>Plant flow rate</span>
                      <span>{calculations.pf} m³/hr</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>Power per m³</span>
                      <span>{calculations.ppm} kW</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>Electricity expense/month</span>
                      <span>{fmtCost(calculations.elecPerMonth)}</span>
                    </div>
                  </div>
                </Card>
                <Card title="Investment & CMC" className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50">
                  <div className="space-y-2 text-[13px] text-slate-700">
                    <div className="flex items-start justify-between gap-4">
                      <span>Plant purchase / repair</span>
                      <span>{fmtCost(calculations.pc)}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>CMC charges per year</span>
                      <span>{fmtCost(calculations.cmc)}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>Total saving in life cycle</span>
                      <span>{fmtCost(calculations.totalSaving)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          }
        >
          <div className="print-page space-y-6">
            <Card title="Results Summary" className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-green-200 bg-white p-4 text-center shadow-sm">
                  <div className="mb-2 text-[28px] font-bold text-green-600">{fmtCost(calculations.monthlySaving)}</div>
                  <div className="text-sm text-green-800">Monthly Saving</div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-white p-4 text-center shadow-sm">
                  <div className="mb-2 text-[28px] font-bold text-blue-600">{fmtCost(calculations.yearlySaving)}</div>
                  <div className="text-sm text-blue-800">Yearly Saving</div>
                </div>
                <div className="rounded-lg border border-violet-200 bg-white p-4 text-center shadow-sm">
                  <div className="mb-2 text-[28px] font-bold text-violet-600">
                    {calculations.roiLabel}
                  </div>
                  <div className="text-sm text-violet-800">ROI Period</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <div className="mb-2 text-[28px] font-bold text-slate-700">{fmtCost(calculations.totalSaving)}</div>
                  <div className="text-sm text-slate-700">Total Saving over {calculations.life} years</div>
                </div>
              </div>
            </Card>

            <Card title="Cost Comparison Charts" className="bg-white">
              <div className="space-y-6">
                <div>
                  <div className="mb-3 text-sm font-bold text-slate-700">Monthly cost comparison</div>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={calculations.barData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(value) => fmtLakh(Number(value))} width={78} />
                        <Tooltip formatter={(value: number) => fmtCost(value)} />
                        <Legend />
                        <Bar dataKey="value" name="Value" fill="#1F4E79" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <div className="mb-3 text-sm font-bold text-slate-700">Cumulative cost over plant life</div>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={calculations.lineChartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="label" interval={0} />
                        <YAxis tickFormatter={(value) => fmtLakh(Number(value))} width={78} />
                        <Tooltip formatter={(value: number) => fmtCost(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="buy" name="Buy oxygen" stroke="#E24B4A" strokeWidth={3} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="psa" name="PSA plant" stroke="#3B6D11" strokeWidth={3} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="print-page space-y-6">
            <Card title="Business Case & Recommendation" className="bg-white">
              <div className="space-y-3 text-justify text-[14px] leading-7 text-slate-700">
                <p>
                  The PSA plant can deliver a monthly saving of <span className="font-bold text-green-700">{fmtCost(calculations.monthlySaving)}</span>{' '}
                  compared with buying oxygen. Over {calculations.life} years, the projected total saving is{' '}
                  <span className="font-bold text-green-700">{fmtCost(calculations.totalSaving)}</span>.
                </p>
                <p>
                  The analysis also includes CMC charges of <span className="font-bold text-[#1F4E79]">{fmtCost(calculations.cmcTotal)}</span>{' '}
                  across the analysis period, which should be considered alongside plant purchase or revamp cost.
                </p>
                <p className="font-bold text-[#1F4E79]">
                  Recommendation: Choose the PSA plant where utility cost and savings justify the investment over the plant life.
                </p>
              </div>
            </Card>

            <Card title="Full calculation sheet" className="bg-white">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Parameter</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">UOM</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'OXYGEN PURCHASE (CURRENT)', uom: '', val: '', section: true },
                      { label: mode === 'cylinder' ? 'Oxygen cylinders per day' : 'Liquid oxygen tanks per day', uom: mode === 'cylinder' ? 'Nos' : 'Tanks', val: calculations.qty.toString() },
                      { label: mode === 'cylinder' ? 'Gas per cylinder' : 'Gas per tank', uom: 'm³', val: calculations.gv.toString() },
                      { label: 'Oxygen gas used / month', uom: 'm³', val: calculations.gasPerMonth.toFixed(0) },
                      { label: 'Per hour oxygen consumption', uom: 'm³/hr', val: calculations.gasPerHr.toFixed(3) },
                      { label: mode === 'cylinder' ? 'Cost per cylinder' : 'Cost per tank', uom: '₹', val: fmtCost(calculations.uc) },
                      { label: 'Unit price per m³ (current)', uom: '₹/m³', val: fmtCost(calculations.unitPriceOxy) },
                      { label: 'Monthly oxygen expense', uom: '₹', val: fmtCost(calculations.oxyMonthCost) },
                      { label: 'PSA OXYGEN PLANT', uom: '', val: '', section: true },
                      { label: 'PSA plant flow rate', uom: 'm³/hr', val: calculations.pf.toString() },
                      { label: 'Power per m³ produced', uom: 'kW', val: calculations.ppm.toString() },
                      { label: 'Electricity expense per month', uom: '₹', val: fmtCost(calculations.elecPerMonth) },
                      { label: 'Unit price per m³ (PSA)', uom: '₹/m³', val: fmtCost(calculations.unitPricePSA) },
                      { label: 'SAVINGS', uom: '', val: '', section: true },
                      { label: 'Monthly saving by using PSA', uom: '₹', val: fmtCost(calculations.monthlySaving) },
                      { label: 'Yearly saving by using PSA', uom: '₹', val: fmtCost(calculations.yearlySaving) },
                      { label: 'ROI & INVESTMENT', uom: '', val: '', section: true },
                      { label: calculations.costMode === 'new' ? 'Oxygen plant purchase cost' : 'Plant repair / restoration cost', uom: '₹', val: fmtCost(calculations.pc) },
                      { label: 'ROI period', uom: calculations.roiSheetUnit, val: calculations.roiSheetValue },
                      { label: 'Life of oxygen plant', uom: 'Years', val: calculations.life.toString() },
                      { label: 'CMC charges per year', uom: '₹', val: fmtCost(calculations.cmc) },
                      { label: `CMC charges for ${calculations.life} years`, uom: '₹', val: fmtCost(calculations.cmcTotal) },
                      { label: `Total saving in ${calculations.life} years`, uom: '₹', val: fmtCost(calculations.totalSaving), section: true },
                    ].map((row, index) => (
                      <tr key={`${row.label}-${index}`} className={row.section ? 'bg-slate-50' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className={`border-b border-slate-100 px-3 py-2 ${row.section ? 'font-bold text-[#1F4E79]' : 'text-slate-700'}`}>{row.label}</td>
                        <td className="border-b border-slate-100 px-3 py-2 text-[12px] text-slate-500">{row.uom}</td>
                        <td className={`border-b border-slate-100 px-3 py-2 text-right ${row.section ? 'font-bold text-[#1F4E79]' : 'text-slate-700'}`}>{row.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </ReportLayout>
      </div>
    </div>
  );
}