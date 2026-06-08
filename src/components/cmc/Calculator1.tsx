import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DownloadPdfButton from '../DownloadPdfButton';
// import { ReportLayout } from '../ReportLayout';
import { ReportLayoutShield } from '../ReportLayoutShield';
import BreakdownTable, { type BreakdownRow } from './BreakdownTable';
import { Card, DerivedBox, Field, MetricCard, NumberInput, TextInput, Verdict, SectionPill } from './UI';
import { fmtINR, fmtK, fmtLakh, n2f } from './format';

const fmtCost = (v: number) => `${fmtINR(v)}/-`;

type DtMode = 'cylinder' | 'liquid';
type PrintMeta = {
  client: string;
  by: string;
  plant: string;
};

const DT_MODES: Record<
  DtMode,
  {
    qtyLabel: string;
    qtyHint: string;
    gpuLabel: string;
    gpuHint: string;
    costLabel: string;
    costHint: string;
    qtyDef: number;
    gpuDef: number;
    costDef: number;
  }
> = {
  cylinder: {
    qtyLabel: 'Cylinders needed per day during breakdown',
    qtyHint: 'How many cylinders the hospital requires per day when the PSA plant is down',
    gpuLabel: 'Gas per cylinder (m³)',
    gpuHint: 'Standard cylinder ~6.5 m³ (7 m³ water capacity)',
    costLabel: 'Cost per cylinder ₹',
    costHint: 'Incl. rent, delivery, demurrage — emergency rates may be higher',
    qtyDef: 8,
    gpuDef: 6.5,
    costDef: 380,
  },
  liquid: {
    qtyLabel: 'LOX tanks needed per day during breakdown',
    qtyHint: 'How many liquid oxygen tanks required per day during plant downtime',
    gpuLabel: 'Gas per LOX tank (m³)',
    gpuHint: 'Standard LOX tank ~185 m³',
    costLabel: 'Cost per LOX tank ₹',
    costHint: 'Per cryogenic tanker/dewar delivery — emergency supply may cost more',
    qtyDef: 1.5,
    gpuDef: 185,
    costDef: 35000,
  },
};

function sanitizeNonNegative(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}

function getRoiMetrics(annualSavings: number, plantCost: number) {
  if (annualSavings <= 0 || plantCost <= 0) {
    return { roiPercentage: null as number | null, paybackMonths: null as number | null };
  }

  return {
    roiPercentage: (annualSavings / plantCost) * 100,
    paybackMonths: plantCost / (annualSavings / 12),
  };
}

export default function CMCCalculator1() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [meta, setMeta] = useState<PrintMeta>({ client: '', by: '', plant: '' });
  const [pmVisits, setPmVisits] = useState(4);
  const [pmEach, setPmEach] = useState(10000);
  const [cons, setCons] = useState(55000);
  const [bdLabour, setBdLabour] = useState(45000);
  const [bdSpares, setBdSpares] = useState(80000);
  const [bdCount, setBdCount] = useState(2);
  const [dtMode, setDtMode] = useState<DtMode>('cylinder');
  const [dtQty, setDtQty] = useState(DT_MODES.cylinder.qtyDef);
  const [dtGpu, setDtGpu] = useState(DT_MODES.cylinder.gpuDef);
  const [dtCost, setDtCost] = useState(DT_MODES.cylinder.costDef);
  const [dtDays, setDtDays] = useState(2);
  const [dtOther, setDtOther] = useState(2000);
  const [lab, setLab] = useState(8000);
  const [cmcCost, setCmcCost] = useState(250000);
  const [gstRate, setGstRate] = useState(18);
  const [cmcBd, setCmcBd] = useState(0.5);
  const [cmcDd, setCmcDd] = useState(1);

  const ml = DT_MODES[dtMode];

  useEffect(() => {
    setDtQty(ml.qtyDef);
    setDtGpu(ml.gpuDef);
    setDtCost(ml.costDef);
  }, [dtMode, ml.costDef, ml.gpuDef, ml.qtyDef]);

  const calculations = useMemo(() => {
    const pv = n2f(pmVisits);
    const pe = n2f(pmEach);
    const pm = pv * pe;
    const co = n2f(cons);
    const bdl = n2f(bdLabour);
    const bds = n2f(bdSpares);
    const bdc = n2f(bdCount);
    const dq = n2f(dtQty);
    const dg = n2f(dtGpu);
    const dc = n2f(dtCost);
    const dd = n2f(dtDays);
    const dother = n2f(dtOther);
    const lv = n2f(lab);
    const cmc = n2f(cmcCost);
    const gst = n2f(gstRate) / 100;
    const cbd = n2f(cmcBd);
    const cdd = n2f(cmcDd);

    const oxyPerDay = dq * dc;
    const oxyPerBd = oxyPerDay * dd;
    const oxyAnnual = oxyPerBd * bdc;
    const gasPerBd = dq * dg * dd;
    const gasAnnual = gasPerBd * bdc;
    const unitPriceDt = dg > 0 ? dc / dg : 0;
    const otherAnnual = dother * dd * bdc;
    const dtTotal = oxyAnnual + otherAnnual;
    const dtCostPerDay = oxyPerDay + dother;
    const current = pm + co + (bdl + bds) * bdc + dtTotal + lv;
    const cmcGross = cmc * (1 + gst);
    const cmcDowntime = dtCostPerDay * cdd * cbd;
    const cmcTotal = cmcGross + cmcDowntime;
    const annualSavings = current - cmcTotal;
    const save5yr = annualSavings * 5;

    const tableRows: BreakdownRow[] = [
      { label: 'CURRENT AD-HOC COSTS', current: '', cmc: '', section: true },
      { label: `Scheduled PM visits (${pv} × ${fmtCost(pe)}/visit)`, current: fmtCost(pm), cmc: 'Included in CMC' },
      { label: 'Consumables purchased separately', current: fmtCost(co), cmc: 'Included in CMC' },
      { label: `Breakdown call-out charges (×${bdc})`, current: fmtCost(bdl * bdc), cmc: 'Included in CMC' },
      { label: `Breakdown spare parts (×${bdc})`, current: fmtCost(bds * bdc), cmc: 'Included in CMC' },
      { label: `Downtime — oxygen backup (${bdc} breakdown × ${dd} day(s))`, current: fmtCost(oxyAnnual), cmc: 'Included in CMC' },
      { label: `  ↳ ${dq} ${dtMode === 'cylinder' ? 'cyl' : 'tank'}(s)/day × ${fmtCost(dc)}/${dtMode === 'cylinder' ? 'cyl' : 'tank'} × ${bdc}×${dd} days`, current: fmtCost(oxyAnnual), cmc: '' },
      { label: `  ↳ Gas consumed: ${gasAnnual.toFixed(0)} m³/yr @ ${fmtCost(unitPriceDt)}/m³`, current: '', cmc: '' },
      { label: `Downtime — other costs (${bdc}×${dd} days × ${fmtCost(dother)}/day)`, current: fmtCost(otherAnnual), cmc: 'Included in CMC' },
      { label: 'Purity lab certificate', current: fmtCost(lv), cmc: 'Included in CMC' },
      { label: 'TOTAL — CURRENT', current: fmtCost(current), cmc: '—', section: true },
      { label: 'CMC CONTRACT', current: '', cmc: '', section: true },
      { label: 'CMC base value (ex-GST)', current: '—', cmc: fmtCost(cmc) },
      { label: `GST @ ${(gst * 100).toFixed(0)}%`, current: '—', cmc: fmtCost(cmc * gst) },
      { label: `Residual downtime cost under CMC (${cbd} breakdown × ${cdd} day(s))`, current: '—', cmc: fmtCost(cmcDowntime) },
      { label: 'TOTAL — CMC', current: '—', cmc: fmtCost(cmcTotal), section: true },
      {
        label: 'NET SAVING / (EXTRA COST)',
        current: fmtCost(annualSavings >= 0 ? annualSavings : 0),
        cmc: fmtCost(annualSavings < 0 ? Math.abs(annualSavings) : 0),
        section: true,
      },
    ];

    const chartData = [
      { name: 'PM visits', current: pm, cmc: 0 },
      { name: 'Consumables', current: co, cmc: 0 },
      { name: 'BD labour', current: bdl * bdc, cmc: 0 },
      { name: 'BD spares', current: bds * bdc, cmc: 0 },
      { name: 'Downtime', current: dtTotal, cmc: cmcDowntime },
      { name: 'Lab test', current: lv, cmc: 0 },
      { name: 'CMC+GST', current: 0, cmc: cmcGross },
    ];
    const lineChartData = [
      { year: 0, current: 0, cmc: 0 },
      { year: 1, current, cmc: cmcTotal },
      { year: 2, current: current * 2, cmc: cmcTotal * 2 },
      { year: 3, current: current * 3, cmc: cmcTotal * 3 },
      { year: 4, current: current * 4, cmc: cmcTotal * 4 },
      { year: 5, current: current * 5, cmc: cmcTotal * 5 },
    ];

    return {
      pv,
      pe,
      pm,
      co,
      bdl,
      bds,
      bdc,
      dq,
      dg,
      dc,
      dd,
      dother,
      lv,
      cmc,
      gst,
      cbd,
      cdd,
      oxyPerDay,
      oxyPerBd,
      oxyAnnual,
      gasPerBd,
      gasAnnual,
      unitPriceDt,
      otherAnnual,
      dtTotal,
      dtCostPerDay,
      current,
      cmcGross,
      cmcDowntime,
      cmcTotal,
      annualSavings,
      save5yr,
      tableRows,
      chartData,
      lineChartData,
    };
  }, [bdCount, bdLabour, bdSpares, cmcBd, cmcCost, cmcDd, cons, dtCost, dtDays, dtGpu, dtMode, dtOther, dtQty, gstRate, lab, pmEach, pmVisits]);

  const roiMetrics = getRoiMetrics(calculations.annualSavings, calculations.cmcTotal);
  const verdictType = calculations.annualSavings >= 0 ? 'save' : 'loss';
  const verdictText =
    calculations.annualSavings >= 0
      ? `Switching to CMC saves ${fmtCost(calculations.annualSavings)} per year. Over 5 years that is ${fmtCost(calculations.save5yr)} in total savings.`
      : `The CMC costs ${fmtCost(Math.abs(calculations.annualSavings))} more per year than current ad-hoc spend. Review breakdown frequency inputs.`;

  const reportSummary = (
    <p className="text-justify">
      This report compares the current annual maintenance spend of a PSA oxygen plant against an Absstem Shield CMC contract.
      The analysis combines preventive visits, consumables, breakdown labour, spares, downtime oxygen backup and the CMC contract
      to show annual savings and a five-year savings view.
    </p>
  );

  const reportInputParameters = (
    <Card title="Input Parameters" className="bg-white">
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
    </Card>
  );

  const reportPageOneCards = (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card title="Current ad-hoc costs (per year)" className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="space-y-2 text-[13px] text-slate-700">
          <div className="flex items-start justify-between gap-4">
            <span>Scheduled PM visits</span>
            <span>{fmtCost(calculations.pm)}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span>Consumables purchased separately</span>
            <span>{fmtCost(calculations.co)}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span>Breakdown call-out charges</span>
            <span>{fmtCost(calculations.bdl * calculations.bdc)}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span>Breakdown spare parts</span>
            <span>{fmtCost(calculations.bds * calculations.bdc)}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span>Downtime oxygen backup</span>
            <span>{fmtCost(calculations.oxyAnnual)}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span>Purity lab certificate</span>
            <span>{fmtCost(calculations.lv)}</span>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="flex items-start justify-between gap-4 text-lg font-bold text-blue-800">
            <span>Total Current Cost</span>
            <span>{fmtCost(calculations.current)}</span>
          </div>
        </div>
      </Card>

      <Card title="Absstem Shield CMC contract" className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50">
        <div className="space-y-2 text-[13px] text-slate-700">
          <div className="flex items-start justify-between gap-4">
            <span>CMC base value (ex-GST)</span>
            <span>{fmtCost(calculations.cmc)}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span>GST</span>
            <span>{fmtCost(calculations.cmc * calculations.gst)}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span>Residual downtime cost</span>
            <span>{fmtCost(calculations.cmcDowntime)}</span>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="flex items-start justify-between gap-4 text-lg font-bold text-emerald-800">
            <span>Total CMC Cost</span>
            <span>{fmtCost(calculations.cmcTotal)}</span>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-normal text-slate-900">
      <div className="mb-4 flex justify-end print:hidden">
        <DownloadPdfButton
          contentToPrint={reportRef}
          tabName="CMC_CALCULATOR_1"
          letterheadPath="/absstem_shield_letterhead.jpg"
          inputs={{
            meta,
            pmVisits,
            pmEach,
            cons,
            bdLabour,
            bdSpares,
            bdCount,
            dtMode,
            dtQty,
            dtGpu,
            dtCost,
            dtDays,
            dtOther,
            lab,
            cmcCost,
            gstRate,
            cmcBd,
            cmcDd,
          }}
        />
      </div>

      <div className="space-y-6 print:hidden">
        <p className="text-[19px] font-bold text-[#1F4E79]">Existing Maintenance vs Absstem Shield CMC</p>
        <p className="text-[13px] text-slate-500">
          Enter your current annual maintenance costs to see how they compare to an Absstem Shield CMC contract.
        </p>

        <Card className="bg-white">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
            <Field label="Client / Hospital name">
              <TextInput
                value={meta.client}
                placeholder="e.g. Apollo Hospital, Gurugram"
                onChange={(value) => setMeta((prev) => ({ ...prev, client: value }))}
              />
            </Field>
            <Field label="Prepared by">
              <TextInput
                value={meta.by}
                placeholder="e.g. Sarwan Kumar"
                onChange={(value) => setMeta((prev) => ({ ...prev, by: value }))}
              />
            </Field>
            <Field label="Plant / Location">
              <TextInput
                value={meta.plant}
                placeholder="e.g. PSA 670 LPM, Ward Block A"
                onChange={(value) => setMeta((prev) => ({ ...prev, plant: value }))}
              />
            </Field>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Current ad-hoc costs (per year)" className="bg-white">
            <Field label="Number of preventive visits per year" hint="How many PM visits the vendor/engineer currently does per year">
              <NumberInput value={pmVisits} min={0} step={1} onChange={(value) => setPmVisits(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="Cost per preventive visit ₹" hint="Labour + travel charges per visit (incl. GST if applicable)">
              <NumberInput value={pmEach} min={0} step={500} onChange={(value) => setPmEach(sanitizeNonNegative(value, 0))} />
            </Field>
            {calculations.pv > 0 ? (
              <DerivedBox>
                Annual PM cost: <strong className="text-[#1F4E79]">{fmtCost(calculations.pm)}</strong>{' '}
                ({calculations.pv} visit{calculations.pv !== 1 ? 's' : ''} × {fmtCost(calculations.pe)}/visit)
              </DerivedBox>
            ) : null}
            <Field label="Consumables purchased separately ₹" hint="Filters, sensors, oil, separator, grease etc.">
              <NumberInput value={cons} min={0} step={1000} onChange={(value) => setCons(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="Breakdown call-out charges ₹" hint="Labour + travel per breakdown × avg number of breakdowns">
              <NumberInput value={bdLabour} min={0} step={1000} onChange={(value) => setBdLabour(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="Breakdown spare parts cost ₹">
              <NumberInput value={bdSpares} min={0} step={1000} onChange={(value) => setBdSpares(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="Avg breakdowns per year">
              <NumberInput value={bdCount} min={0} step={1} onChange={(value) => setBdCount(sanitizeNonNegative(value, 0))} />
            </Field>

            <Field label="Backup oxygen source during breakdown">
              <select
                value={dtMode}
                onChange={(event) => setDtMode(event.target.value as DtMode)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              >
                <option value="cylinder">Cylinders (per cylinder)</option>
                <option value="liquid">Liquid Oxygen / LOX (per tank)</option>
              </select>
            </Field>
            <Field label={ml.qtyLabel} hint={ml.qtyHint}>
              <NumberInput value={dtQty} min={0} step={dtMode === 'cylinder' ? 1 : 0.5} onChange={(value) => setDtQty(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label={ml.gpuLabel} hint={ml.gpuHint}>
              <NumberInput value={dtGpu} min={0} step={0.5} onChange={(value) => setDtGpu(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label={ml.costLabel} hint={ml.costHint}>
              <NumberInput value={dtCost} min={0} step={dtMode === 'cylinder' ? 10 : 500} onChange={(value) => setDtCost(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="Avg downtime per breakdown (days)">
              <NumberInput value={dtDays} min={0} step={0.5} onChange={(value) => setDtDays(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="Other downtime costs per day ₹" hint="Clinical disruption, staff overtime, emergency logistics etc.">
              <NumberInput value={dtOther} min={0} step={500} onChange={(value) => setDtOther(sanitizeNonNegative(value, 0))} />
            </Field>
            <DerivedBox>
              <div className="font-bold text-[#1F4E79]">
                Per breakdown event ({calculations.dd} day{calculations.dd !== 1 ? 's' : ''})
              </div>
              <div>
                {dtMode === 'cylinder' ? 'Cylinder' : 'LOX tank'} qty:{' '}
                <strong className="text-slate-700">
                  {calculations.dq} {dtMode === 'cylinder' ? 'cyl' : 'tank'}/day × {calculations.dd} days = {(calculations.dq * calculations.dd).toFixed(1)}{' '}
                  {dtMode === 'cylinder' ? 'cyl' : 'tank'}(s)
                </strong>
              </div>
              <div>
                Gas consumed: <strong className="text-slate-700">{calculations.gasPerBd.toFixed(1)} m³</strong>
              </div>
              <div>
                Oxygen cost: <strong className="text-[#A32D2D]">{fmtCost(calculations.oxyPerBd)}</strong> ({calculations.dq} × {fmtCost(calculations.dc)} × {calculations.dd} days)
              </div>
              <div>
                Unit price during downtime: <strong className="text-[#A32D2D]">{fmtINR(calculations.unitPriceDt)}/m³</strong>
              </div>
              <div>
                Other costs: <strong className="text-slate-700">{fmtCost(calculations.dother * calculations.dd)}</strong> ({fmtCost(calculations.dother)}/day × {calculations.dd} days)
              </div>
              <div className="mt-2 border-t border-slate-200 pt-2 font-bold">
                Cost per breakdown: <strong className="text-[#A32D2D]">{fmtCost(calculations.oxyPerBd + calculations.dother * calculations.dd)}</strong>
              </div>
              <div className="font-bold">
                Annual ({calculations.bdc} breakdown{calculations.bdc !== 1 ? 's' : ''}): <strong className="text-[#A32D2D]">{fmtCost(calculations.dtTotal)}</strong>
              </div>
            </DerivedBox>
            <Field label="Annual purity lab certificate ₹" hint="Included in CMC — enter your current annual lab test cost">
              <NumberInput value={lab} min={0} step={500} onChange={(value) => setLab(sanitizeNonNegative(value, 0))} />
            </Field>
          </Card>

          <Card title="Absstem Shield CMC contract" className="bg-white">
            <Field label="Annual CMC cost (ex-GST) ₹">
              <NumberInput value={cmcCost} min={0} step={5000} onChange={(value) => setCmcCost(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="GST rate (%)">
              <NumberInput value={gstRate} min={0} max={28} step={1} onChange={(value) => setGstRate(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="Expected breakdowns per year under CMC" hint="0.5 = 1 breakdown in 2 years. Preventive maintenance reduces breakdown frequency.">
              <NumberInput value={cmcBd} min={0} max={10} step={0.5} onChange={(value) => setCmcBd(sanitizeNonNegative(value, 0))} />
            </Field>
            <Field label="Avg downtime per breakdown under CMC (days)" hint="Faster response under CMC reduces downtime duration">
              <NumberInput value={cmcDd} min={0} max={10} step={0.5} onChange={(value) => setCmcDd(sanitizeNonNegative(value, 0))} />
            </Field>
            <DerivedBox>
              <div>
                CMC total (incl. GST): <strong className="text-[#1F4E79]">{fmtCost(calculations.cmcGross)}</strong>
              </div>
              <div>
                Residual downtime under CMC: <strong className="text-slate-700">{fmtCost(calculations.cmcDowntime)}</strong>
              </div>
              <div className="mt-2 border-t border-slate-200 pt-2 font-bold">
                Total CMC cost: <strong className="text-[#1F4E79]">{fmtCost(calculations.cmcTotal)}</strong>
              </div>
            </DerivedBox>
          </Card>
        </div>

        <SectionPill label="Key results" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard label="Current annual cost" value={fmtCost(calculations.current)} color="var(--red)" />
          <MetricCard label="CMC annual cost (incl. GST)" value={fmtCost(calculations.cmcTotal)} />
          <MetricCard
            label={calculations.annualSavings >= 0 ? 'Annual saving' : 'Extra cost'}
            value={fmtCost(Math.abs(calculations.annualSavings))}
            color={calculations.annualSavings >= 0 ? 'var(--green)' : 'var(--red)'}
          />
          <MetricCard label="5-year saving" value={fmtCost(Math.abs(calculations.save5yr))} color={calculations.save5yr >= 0 ? 'var(--green)' : 'var(--red)'} />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            label="ROI period"
            value={
              roiMetrics.roiPercentage !== null && roiMetrics.paybackMonths !== null
                ? roiMetrics.paybackMonths < 12
                  ? `${roiMetrics.paybackMonths.toFixed(2)} months`
                  : `${(roiMetrics.paybackMonths / 12).toFixed(2)} years`
                : 'N/A'
            }
            color="var(--navy)"
          />
          <MetricCard
            label="Annual savings percentage"
            value={roiMetrics.roiPercentage !== null ? `${roiMetrics.roiPercentage.toFixed(1)}%` : 'N/A'}
            color="var(--navy)"
          />
          <MetricCard label="CMC over 5 years" value={fmtCost(calculations.cmcGross * 5)} />
        </div>

        <Verdict type={verdictType}>{verdictText}</Verdict>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card title="Cost comparison by category" className="bg-white">
            <div className="mb-3 flex flex-wrap gap-4 text-[12px] text-slate-500">
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#E24B4A]" />
                Current ad-hoc cost
              </span>
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#3B6D11]" />
                Under CMC
              </span>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calculations.chartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => fmtK(Number(value))} width={78} />
                  <Tooltip formatter={(value: number) => fmtCost(value)} />
                  <Legend />
                  <Bar dataKey="current" name="Current" fill="#E24B4A" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                    {calculations.chartData.map((entry) => (
                      <Cell key={`current-${entry.name}`} fill="#E24B4A" />
                    ))}
                  </Bar>
                  <Bar dataKey="cmc" name="Under CMC" fill="#3B6D11" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                    {calculations.chartData.map((entry) => (
                      <Cell key={`cmc-${entry.name}`} fill="#3B6D11" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Current vs CMC over 5 years" className="bg-white">
            <div className="mb-3 flex flex-wrap gap-4 text-[12px] text-slate-500">
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#E24B4A]" />
                Current
              </span>
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#3B6D11]" />
                Under CMC
              </span>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={calculations.lineChartData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => fmtLakh(Number(value))} width={78} />
                  <Tooltip formatter={(value: number) => fmtCost(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="current" name="Current" stroke="#E24B4A" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="cmc" name="Under CMC" stroke="#3B6D11" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card title="Detailed cost breakdown" className="bg-white">
          <BreakdownTable rows={calculations.tableRows} />
        </Card>
      </div>

      <div className="print:hidden">
        <ReportLayoutShield
          ref={reportRef}
          title="Existing Maintenance vs Absstem Shield CMC"
          summary={reportSummary}
          pageOneContent={
            <div className="space-y-6">
              {reportInputParameters}
              {reportPageOneCards}
            </div>
          }
        >
          <div className="print-page space-y-6">
            <Card title="Savings Analysis" className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-green-200 bg-white p-4 text-center shadow-sm">
                  <div className="mb-2 text-[28px] font-bold text-green-600">{fmtCost(calculations.annualSavings)}</div>
                  <div className="text-sm text-green-800">Annual Operating Cost Savings</div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-white p-4 text-center shadow-sm">
                  <div className="mb-2 text-[28px] font-bold text-blue-600">{fmtCost(calculations.save5yr)}</div>
                  <div className="text-sm text-blue-800">Total 5-Year Savings</div>
                </div>
                <div className="rounded-lg border border-violet-200 bg-white p-4 text-center shadow-sm">
                  <div className="mb-2 text-[28px] font-bold text-violet-600">
                    {roiMetrics.roiPercentage !== null ? `${roiMetrics.roiPercentage.toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-violet-800">Return on Investment</div>
                  <div className="text-sm text-violet-800">
                    {roiMetrics.paybackMonths !== null ? `Payback in ${roiMetrics.paybackMonths.toFixed(1)} months` : 'Payback unavailable'}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Cost Comparison Charts" className="bg-white">
              <div className="space-y-6">
                <div>
                  <div className="mb-3 text-sm font-bold text-slate-700">Cost comparison by category</div>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={calculations.chartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(value) => fmtK(Number(value))} width={78} />
                        <Tooltip formatter={(value: number) => fmtCost(value)} />
                        <Legend />
                        <Bar dataKey="current" name="Current" fill="#E24B4A" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                          {calculations.chartData.map((entry) => (
                            <Cell key={`current-${entry.name}`} fill="#E24B4A" />
                          ))}
                        </Bar>
                        <Bar dataKey="cmc" name="Under CMC" fill="#3B6D11" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                          {calculations.chartData.map((entry) => (
                            <Cell key={`cmc-${entry.name}`} fill="#3B6D11" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <div className="mb-3 text-sm font-bold text-slate-700">Current vs CMC over 5 years</div>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={calculations.lineChartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="year" />
                        <YAxis tickFormatter={(value) => fmtLakh(Number(value))} width={78} />
                        <Tooltip formatter={(value: number) => fmtCost(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="current" name="Current" stroke="#E24B4A" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                        <Line type="monotone" dataKey="cmc" name="Under CMC" stroke="#3B6D11" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="print-page space-y-6">
            <Card title="Recommendation" className="border-slate-200 bg-white">
              <div className="space-y-3 text-justify text-[14px] leading-7 text-slate-700">
                <p>
                  This comparison shows the lifecycle impact of upgrading from a standalone PSA maintenance approach to an Absstem Shield CMC contract.
                  The projected annual operating-cost difference is <span className="font-bold text-green-700">{fmtCost(calculations.annualSavings)}</span>, with a five-year savings impact of{' '}
                  <span className="font-bold text-green-700">{fmtCost(calculations.save5yr)}</span>.
                </p>
                <p>
                  Beyond direct operating cost, the CMC option reduces breakdown downtime and simplifies upkeep by bundling preventive maintenance,
                  spares and response coverage into one contract.
                </p>
                <p className="font-bold text-[#1F4E79]">
                  Recommendation: Use CMC when the service coverage and downtime reduction justify the annual contract cost.
                </p>
              </div>
            </Card>

            <Card title="10-Year Cumulative Savings" className="bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-[13px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Item</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Current</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Under CMC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {calculations.tableRows.map((row, index) => (
                      <tr key={`report-row-${index}`} className={row.section ? 'bg-slate-50' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className={`px-4 py-3 ${row.section ? 'font-bold text-[#1F4E79]' : 'text-slate-700'}`}>{row.label}</td>
                        <td className={`px-4 py-3 text-right ${row.section ? 'font-bold text-[#1F4E79]' : 'text-slate-700'}`}>{row.current}</td>
                        <td className={`px-4 py-3 text-right ${row.section ? 'font-bold text-[#1F4E79]' : 'text-slate-700'}`}>{row.cmc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </ReportLayoutShield>
      </div>
    </div>
  );
}