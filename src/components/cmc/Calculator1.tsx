// src/components/cmc/Calculator1.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DownloadPdfButton from '../DownloadPdfButton';
import { ReportLayoutShield } from '../ReportLayoutShield';
import BreakdownTable, { type BreakdownRow } from './BreakdownTable';
import { Card, DerivedBox, Field, MetricCard, NumberInput, TextInput, Verdict, SectionPill } from './UI';
import { fmtINR, fmtK, fmtLakh, n2f } from './format';
import { VolumeUnit, getUnitDisplay, getUnitSuperscript, convertToNm3, convertFromNm3 } from './conversions';

const fmtCost = (v: number) => `${fmtINR(v)}/-`;

type DtMode = 'cylinder' | 'liquid';
type MaintenanceMode = 'invoice' | 'scheduled';
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
    gpuHint: 'Standard cylinder (7 m³ water capacity)',
    costLabel: 'Cost per cylinder ₹',
    costHint: 'Incl. rent, delivery, demurrage — emergency rates may be higher',
    qtyDef: 8,
    gpuDef: 7,
    costDef: 400,
  },
  liquid: {
    qtyLabel: '',
    qtyHint: '',
    gpuLabel: '',
    gpuHint: '',
    costLabel: '',
    costHint: '',
    qtyDef: 0,
    gpuDef: 0,
    costDef: 0,
  },
};

function sanitizeNonNegative(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}

function sanitizePositive(value: string, fallback = 160000) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
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
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceMode>('invoice');
  const [invoiceCost, setInvoiceCost] = useState(160000);
  const [pmVisits, setPmVisits] = useState(4);
  const [pmEach, setPmEach] = useState(10000);
  const [cons, setCons] = useState(55000);
  const [bdSpares, setBdSpares] = useState(80000);
  const [bdCount] = useState(1);
  const [dtMode, setDtMode] = useState<DtMode>('cylinder');
  const [dtQty, setDtQty] = useState(DT_MODES.cylinder.qtyDef);
  const [dtGpu, setDtGpu] = useState(DT_MODES.cylinder.gpuDef);
  const [dtCost, setDtCost] = useState(DT_MODES.cylinder.costDef);
  // Liquid oxygen specific fields
  const [loxDailyUseValue, setLoxDailyUseValue] = useState(10000);
  const [loxDailyUseUnit, setLoxDailyUseUnit] = useState<VolumeUnit>('Nm3');
  const [loxGasCostValue, setLoxGasCostValue] = useState(15);
  const [loxGasCostUnit, setLoxGasCostUnit] = useState<VolumeUnit>('Nm3');
  const [loxRentalCost, setLoxRentalCost] = useState(25000);
  const [avgDowntimePerYear, setAvgDowntimePerYear] = useState(20);
  const [dtOther, setDtOther] = useState(2000);
  const [cmcCost, setCmcCost] = useState(250000);
  const [cmcDd, setCmcDd] = useState(2);

  const ml = DT_MODES[dtMode];

  useEffect(() => {
    if (dtMode === 'cylinder') {
      setDtQty(ml.qtyDef);
      setDtGpu(ml.gpuDef);
      setDtCost(ml.costDef);
    }
  }, [dtMode, ml.costDef, ml.gpuDef, ml.qtyDef]);

  const calculations = useMemo(() => {
    const pv = n2f(pmVisits);
    const pe = n2f(pmEach);
    const pm = pv * pe;
    const co = n2f(cons);
    const bds = n2f(bdSpares);
    const bdc = 1;
    const invoiceVal = n2f(invoiceCost);
    const maintenanceTotal = maintenanceMode === 'invoice' ? invoiceVal : pm + co + bds * bdc;
    const dq = n2f(dtQty);
    const dg = n2f(dtGpu);
    const dc = n2f(dtCost);
    const add = n2f(avgDowntimePerYear);
    const dother = n2f(dtOther);
    const cmc = n2f(cmcCost);
    const cbd = 0.5;
    const cdd = n2f(cmcDd);

    let oxyPerDay: number;
    let oxyPerBd: number;
    let oxyAnnual: number;
    let gasPerBd: number;
    let gasAnnual: number;
    let unitPriceDt: number;
    let gasConsumedLabel: string;

    if (dtMode === 'cylinder') {
      oxyPerDay = dq * dc;
      oxyPerBd = oxyPerDay * add;
      oxyAnnual = oxyPerBd * bdc;
      gasPerBd = dq * dg * add;
      gasAnnual = gasPerBd * bdc;
      unitPriceDt = dg > 0 ? dc / dg : 0;
      gasConsumedLabel = `Gas consumed: ${gasAnnual.toFixed(0)} m³/yr @ ${fmtINR(unitPriceDt)}/m³`;
    } else {
      // Liquid mode: daily use in Nm3 × gas cost per Nm3
      const loxDailyNm3 = convertToNm3(loxDailyUseValue, loxDailyUseUnit);
      const loxGasCostPerNm3 = loxGasCostValue / convertToNm3(1, loxGasCostUnit);
      oxyPerDay = loxDailyNm3 * loxGasCostPerNm3;
      oxyPerBd = oxyPerDay * add;
      oxyAnnual = oxyPerBd * bdc;
      gasPerBd = loxDailyNm3 * add;
      gasAnnual = gasPerBd * bdc;
      unitPriceDt = loxGasCostPerNm3;
      gasConsumedLabel = `Gas consumed: ${gasAnnual.toFixed(0)} Nm³/yr @ ${fmtINR(unitPriceDt)}/Nm³`;
    }

    const loxRental = dtMode === 'cylinder' ? 0 : n2f(loxRentalCost);
    const otherAnnual = dother * add * bdc;
    const dtTotal = oxyAnnual + otherAnnual;
    const dtCostPerDay = oxyPerDay + dother;
    
    // Current ad hoc total (no breakdown call-out charges)
    const current = maintenanceTotal + dtTotal + loxRental;
    const cmcGross = cmc;
    const cmcDowntime = dtCostPerDay * cdd;
    const cmcTotal = cmcGross + cmcDowntime;
    const annualSavings = current - cmcTotal;
    const save5yr = annualSavings * 5;

    const maintenanceRows: BreakdownRow[] = maintenanceMode === 'invoice'
      ? [{ label: 'Invoice Cost', current: fmtCost(invoiceVal), cmc: 'Included in CMC' }]
      : [
          { label: `Scheduled PM visits (${pv} × ${fmtCost(pe)}/visit)`, current: fmtCost(pm), cmc: 'Included in CMC' },
          { label: 'Consumables purchased separately', current: fmtCost(co), cmc: 'Included in CMC' },
          { label: `Breakdown spare parts`, current: fmtCost(bds * bdc), cmc: 'Included in CMC' },
        ];

    const tableRows: BreakdownRow[] = [
      { label: 'CURRENT AD-HOC COSTS', current: '', cmc: '', section: true },
      ...maintenanceRows,
      { label: `Downtime — oxygen backup (${add} day(s))`, current: fmtCost(oxyAnnual), cmc: 'Included in CMC' },
      // { label: `  ↳ ${gasConsumedLabel}`, current: fmtCost(oxyAnnual), cmc: '' },
      { label: `Downtime — other costs (${add} days × ${fmtCost(dother)}/day)`, current: fmtCost(otherAnnual), cmc: 'Included in CMC' },
      ...(loxRental > 0 ? [{ label: 'Annual rental cost', current: fmtCost(loxRental), cmc: 'Included in CMC' }] : []),
      { label: 'TOTAL — CURRENT', current: fmtCost(current), cmc: '—', section: true },
      { label: 'CMC CONTRACT', current: '', cmc: '', section: true },
      { label: 'Annual CMC cost', current: '—', cmc: fmtCost(cmc) },
      { label: `Residual downtime cost under CMC (${cdd} day(s))`, current: '—', cmc: fmtCost(cmcDowntime) },
      { label: 'TOTAL — CMC', current: '—', cmc: fmtCost(cmcTotal), section: true },
{
  label: `NET SAVING / (EXTRA COST) = (${fmtCost(current)}) - (${fmtCost(cmcTotal)}) `,
  current: fmtCost(annualSavings >= 0 ? annualSavings : 0),
  cmc: '',
  section: false,
  isTotalSavings: true,
},
    ];

    // Updated chart data: single bar for current (all ad-hoc costs) and single bar for CMC
    const currentAdHocTotal = current;
    const underCMCTotal = cmcTotal;
    
    const chartData = [
      { name: 'Current\nAd-hoc', current, cmc: 0 },
      { name: 'Under\nCMC', current: 0, cmc: cmcDowntime + cmcGross },
    ];
    
    const lineChartData = [
      { year: 'Now', current: 0, cmc: 0 },
      { year: 'Yr 1', current, cmc: cmcTotal },
      { year: 'Yr 2', current: current * 2, cmc: cmcTotal * 2 },
      { year: 'Yr 3', current: current * 3, cmc: cmcTotal * 3 },
      { year: 'Yr 4', current: current * 4, cmc: cmcTotal * 4 },
      { year: 'Yr 5', current: current * 5, cmc: cmcTotal * 5 },
    ];

    return {
      pv,
      pe,
      pm,
      co,
      bds,
      bdc,
      invoiceVal,
      maintenanceTotal,
      dq,      dg,
      dc,
      add,
      dother,
      cmc,
      cbd,
      cdd,
      oxyPerDay,
      oxyPerBd,
      oxyAnnual,
      gasPerBd,
      gasAnnual,
      unitPriceDt,
      loxRental,
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
      currentAdHocTotal,
      underCMCTotal,
    };
  }, [avgDowntimePerYear, bdSpares, cmcCost, cmcDd, cons, dtCost, dtGpu, dtMode, dtOther, dtQty, pmEach, pmVisits, loxDailyUseValue, loxDailyUseUnit, loxGasCostValue, loxGasCostUnit, loxRentalCost, maintenanceMode, invoiceCost]);

  const roiMetrics = getRoiMetrics(calculations.annualSavings, calculations.cmcTotal);
  const verdictType = calculations.annualSavings >= 0 ? 'save' : 'loss';
  const verdictText =
    calculations.annualSavings >= 0
      ? `Switching to CMC saves ${fmtCost(calculations.annualSavings)} per year. Over 5 years that is ${fmtCost(calculations.save5yr)} in total savings. Absstem gives 10 years warranty to your Molecular Sieves.
      

      `
      : `The CMC costs ${fmtCost(Math.abs(calculations.annualSavings))} more per year than current ad-hoc spend. Review breakdown frequency inputs.`;

  const reportSummary = (
    <p className="text-justify text-black-500">
      This report compares the current annual maintenance spend of a PSA oxygen plant against an Absstem Shield CMC contract.
      The analysis combines preventive visits, consumables, breakdown labour, spares, downtime oxygen backup and the CMC contract
      to show annual savings and a five-year savings view.
    </p>
  );

  const reportInputParameters = (
    <Card title="Input Parameters" className="bg-white text-black-500 text-[17px]">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-black-500">Client / Hospital name</div>
          <div className="text-lg font-bold text-slate-900">{meta.client || '—'}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-black-500">Prepared by</div>
          <div className="text-lg font-bold text-slate-900">{meta.by || '—'}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-black-500">Plant / Location</div>
          <div className="text-lg font-bold text-black-900">{meta.plant || '—'}</div>
        </div>
      </div>
    </Card>
  );

  const reportPageOneCards = (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card title="Current ad-hoc costs (per year)" className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="space-y-2 text-[15px] text-black-700">
          {maintenanceMode === 'invoice' ? (
            <div className="flex items-start justify-between gap-4">
              <span>Invoice Cost</span>
              <span>{fmtCost(calculations.invoiceVal)}</span>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <span>Scheduled PM visits</span>
                <span>{fmtCost(calculations.pm)}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span>Consumables purchased separately</span>
                <span>{fmtCost(calculations.co)}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span>Breakdown spare parts</span>
                <span>{fmtCost(calculations.bds * calculations.bdc)}</span>
              </div>
            </>
          )}
          <div className="flex items-start justify-between gap-4">
            <span>Downtime oxygen backup Cost</span>
            <span>{fmtCost(calculations.oxyAnnual + calculations.otherAnnual)}</span>
          </div>
          {calculations.loxRental > 0 && (
            <div className="flex items-start justify-between gap-4">
              <span>Annual Rental cost</span>
              <span>{fmtCost(calculations.loxRental)}</span>
            </div>
          )}
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="flex items-start justify-between gap-4 text-lg font-bold text-blue-800">
            <span>Total Current Cost</span>
            <span>{fmtCost(calculations.current)}</span>
          </div>
        </div>
      </Card>

      <Card title="Absstem Shield CMC contract" className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50">
        <div className="space-y-2 text-[15px] text-black-700">
          <div className="flex items-start justify-between gap-4">
            <span>CMC annual cost</span>
            <span>{fmtCost(calculations.cmc)}</span>
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
    <div className="min-h-screen bg-slate-50 font-lufga-regular text-slate-900">
     <style jsx global>{`
  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-Regular.otf') format('opentype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  
  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-SemiBold.otf') format('opentype');
    font-weight: 600;
    font-style: normal;
    font-display: swap;
  }

  .font-lufga-regular { 
    font-family: 'Lufga', sans-serif; 
    font-weight: 400; 
  }
  
  .font-lufga-bold { 
    font-family: 'Lufga', sans-serif; 
    font-weight: 600; 
  }
`}</style>
      
      <div className="mb-4 flex justify-end print:hidden">
        <DownloadPdfButton
          contentToPrint={reportRef}
          tabName="CMC_CALCULATOR_1"
          letterheadPath="/absstem_shield_letterhead.jpg"
          inputs={{
            meta,
            maintenanceMode,
            invoiceCost,
            pmVisits,
            pmEach,
            cons,
            bdSpares,
            dtMode,
            dtQty,
            dtGpu,
            dtCost,
            avgDowntimePerYear,
            dtOther,
            loxRentalCost,
            cmcCost,
            cmcDd,
          }}
        />
      </div>

      <div className="space-y-6 print:hidden">
        <p className="text-[19px] font-lufga-bold text-[#1F4E79]">Existing Maintenance vs Absstem Shield Premium</p>
        <p className="text-[15px] text-black-500 font-lufga-regular">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 text-black-700">
          <Card className="bg-white">
            <div className="mb-4 text-[19px] font-lufga-bold text-[#1F4E79]">Current ad-hoc costs (per year)</div>
            <Field label="Maintenance Cost" className="font-lufga-regular">
              <select
                value={maintenanceMode}
                onChange={(event) => setMaintenanceMode(event.target.value as MaintenanceMode)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 font-lufga-regular"
              >
                <option value="invoice">Invoice Cost</option>
                <option value="scheduled">Scheduled Cost</option>
              </select>
            </Field>
            {maintenanceMode === 'invoice' ? (
              <Field label="Invoice Cost ₹" hint="Total annual maintenance invoice amount">
                <NumberInput
                  value={invoiceCost}
                  min={1}
                  step={1000}
                  onChange={(value) => setInvoiceCost(sanitizePositive(value, 160000))}
                  onFocus={(e) => e.target.value === '0' && e.target.select()}
                />
              </Field>
            ) : (
              <>
                <Field label="Number of Service visits per year" hint="How many visits the vendor/engineer currently does per year">
                  <NumberInput 
                    value={pmVisits} 
                    min={0} 
                    step={1} 
                    onChange={(value) => setPmVisits(sanitizeNonNegative(value, 0))}
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
                  />
                </Field>
                <Field label="Cost per Service visit ₹" hint="Labour + travel charges per visit">
                  <NumberInput 
                    value={pmEach} 
                    min={0} 
                    step={500} 
                    onChange={(value) => setPmEach(sanitizeNonNegative(value, 0))}
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
                  />
                </Field>
                {calculations.pv > 0 ? (
                  <DerivedBox>
                    Annual PM cost: <strong className="text-[#1F4E79]">{fmtCost(calculations.pm)}</strong>{' '}
                    ({calculations.pv} visit{calculations.pv !== 1 ? 's' : ''} × {fmtCost(calculations.pe)}/visit)
                  </DerivedBox>
                ) : null}
                <Field label="Consumables purchased separately ₹" hint="Filters, sensors, oil, separator, grease etc.">
                  <NumberInput 
                    value={cons} 
                    min={0} 
                    step={1000} 
                    onChange={(value) => setCons(sanitizeNonNegative(value, 0))}
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
                  />
                </Field>
                <Field label="Breakdown spare parts cost ₹">
                  <NumberInput 
                    value={bdSpares} 
                    min={0} 
                    step={1000} 
                    onChange={(value) => setBdSpares(sanitizeNonNegative(value, 0))}
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
                  />
                </Field>
              </>
            )}

            <Field label="Backup Oxygen Source During Breakdown"  className="text-[18px] font-lufga-bold text-[#1F4E79]">
              <select
                value={dtMode}
                onChange={(event) => setDtMode(event.target.value as DtMode)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 font-lufga-regular"
              >
                <option value="cylinder">Cylinders</option>
                <option value="liquid">Liquid Oxygen / LOX</option>
              </select>
            </Field>
            {dtMode === 'cylinder' ? (
              <Field label={ml.qtyLabel} hint={ml.qtyHint}>
                <NumberInput 
                  value={dtQty} 
                  min={0} 
                  step={1} 
                  onChange={(value) => setDtQty(sanitizeNonNegative(value, 0))}
                  onFocus={(e) => e.target.value === '0' && e.target.select()}
                />
              </Field>
            ) : null}
            {dtMode === 'cylinder' ? (
              <>
                <Field label={ml.gpuLabel} hint={ml.gpuHint}>
                  <NumberInput 
                    value={dtGpu} 
                    min={0} 
                    step={0.5} 
                    onChange={(value) => setDtGpu(sanitizeNonNegative(value, 0))}
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
                  />
                </Field>
                <Field label={ml.costLabel} hint={ml.costHint}>
                  <NumberInput 
                    value={dtCost} 
                    min={0} 
                    step={10} 
                    onChange={(value) => setDtCost(sanitizeNonNegative(value, 0))}
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Daily use" hint="Hospital's daily oxygen consumption during breakdown">
                  <div className="flex gap-2">
                    <NumberInput 
                      value={loxDailyUseValue} 
                      min={0} 
                      step={100} 
                      onChange={(value) => setLoxDailyUseValue(sanitizeNonNegative(value, 0))}
                      onFocus={(e) => e.target.value === '0' && e.target.select()}
                    />
                    <select
                      value={loxDailyUseUnit}
                      onChange={(e) => setLoxDailyUseUnit(e.target.value as VolumeUnit)}
                      className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 font-lufga-regular"
                    >
                      {(['Nm3', 'Sm3', 'Liters', 'Kg'] as VolumeUnit[]).map((u) => (
                        <option key={u} value={u}>{getUnitDisplay(u)}</option>
                      ))}
                    </select>
                  </div>
                </Field>
                <Field label="Gas cost" hint="Cost per unit of liquid oxygen">
                  <div className="flex gap-2">
                    <NumberInput 
                      value={loxGasCostValue} 
                      min={0} 
                      step={1} 
                      onChange={(value) => setLoxGasCostValue(sanitizeNonNegative(value, 0))}
                      onFocus={(e) => e.target.value === '0' && e.target.select()}
                    />
                    <select
                      value={loxGasCostUnit}
                      onChange={(e) => setLoxGasCostUnit(e.target.value as VolumeUnit)}
                      className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 font-lufga-regular"
                    >
                      {(['Nm3', 'Sm3', 'Liters', 'Kg'] as VolumeUnit[]).map((u) => (
                        <option key={u} value={u}>{getUnitDisplay(u)}</option>
                      ))}
                    </select>
                  </div>
                </Field>
              </>
            )}
            {dtMode === 'liquid' ? (
              <Field label="Annual Rental cost ₹" hint="Annual LOX tank equipment rental charges">
                <NumberInput
                  value={loxRentalCost}
                  min={0}
                  step={1000}
                  onChange={(value) => setLoxRentalCost(sanitizeNonNegative(value, 0))}
                  onFocus={(e) => e.target.value === '0' && e.target.select()}
                />
              </Field>
            ) : null}
            <Field label="Avg breakdown/downtime Per Year (In Days)" hint="Total downtime days per year due to breakdowns">
              <NumberInput 
                value={avgDowntimePerYear} 
                min={0} 
                step={0.5} 
                onChange={(value) => setAvgDowntimePerYear(sanitizeNonNegative(value, 0))}
                onFocus={(e) => e.target.value === '0' && e.target.select()}
              />
            </Field>
            <Field label="Other downtime costs per day ₹" hint="Clinical disruption, staff overtime, emergency logistics etc.">
              <NumberInput 
                value={dtOther} 
                min={0} 
                step={500} 
                onChange={(value) => setDtOther(sanitizeNonNegative(value, 0))}
                onFocus={(e) => e.target.value === '0' && e.target.select()}
              />
            </Field>
            <DerivedBox>
              <div className="font-lufga-bold text-[#1F4E79]">
                Per breakdown event ({calculations.add} day{calculations.add !== 1 ? 's' : ''})
              </div>
              {dtMode === 'cylinder' ? (
                <>
                  <div>
                    Cylinder qty:{' '}
                    <strong className="text-slate-700">
                      {calculations.dq} cyl/day × {calculations.add} days = {(calculations.dq * calculations.add).toFixed(1)} cyl(s)
                    </strong>
                  </div>
                  <div>
                    Gas consumed: <strong className="text-slate-700">{calculations.gasPerBd.toFixed(1)} m³</strong>
                  </div>
                  <div>
                    Oxygen cost: <strong className="text-[#A32D2D]">{fmtCost(calculations.oxyPerBd)}</strong> ({calculations.dq} × {fmtCost(calculations.dc)} × {calculations.add} days)
                  </div>
                  <div>
                    Unit price during downtime: <strong className="text-[#A32D2D]">{fmtINR(calculations.unitPriceDt)}/m³</strong>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    Daily use: <strong className="text-slate-700">{loxDailyUseValue} {getUnitDisplay(loxDailyUseUnit)} = {calculations.gasPerBd.toFixed(1) } Nm³ over {calculations.add} day(s)</strong>
                  </div>
                  <div>
                    Gas cost: <strong className="text-[#A32D2D]">{fmtCost(calculations.oxyPerBd)}</strong> @ {fmtINR(calculations.unitPriceDt)}/Nm³
                  </div>
                </>
              )}
              <div>
                Other costs: <strong className="text-slate-700">{fmtCost(calculations.dother * calculations.add)}</strong> ({fmtCost(calculations.dother)}/day × {calculations.add} days)
              </div>
              {calculations.loxRental > 0 && (
                <div>
                  Annual rental: <strong className="text-[#A32D2D]">{fmtCost(calculations.loxRental)}</strong>
                </div>
              )}
              {/* <div className="mt-2 border-t border-slate-200 pt-2 font-lufga-bold">
                Cost per breakdown: <strong className="text-[#A32D2D]">{fmtCost(calculations.oxyPerBd + calculations.dother * calculations.add)}</strong>
              </div> */}
              <div className="font-lufga-bold">
                Annual downtime cost: <strong className="text-[#A32D2D]">{fmtCost(calculations.dtTotal)}</strong>
              </div>
            </DerivedBox>
          </Card>

          <Card className="bg-white ">
            <div className="mb-4 text-[18px] font-lufga-bold text-[#1F4E79]">Absstem Shield CMC contract</div>
            <Field label="Annual CMC Cost ₹">
              <NumberInput
                value={cmcCost} 
                min={0} 
                step={5000} 
                onChange={(value) => setCmcCost(sanitizeNonNegative(value, 0))}
                onFocus={(e) => e.target.value === '0' && e.target.select()}
              />
            </Field>
            <Field label="Avg downtime per breakdown under CMC (days)" hint="Faster response under CMC reduces downtime duration">
              <NumberInput 
                value={cmcDd} 
                min={0} 
                max={10} 
                step={0.5} 
                onChange={(value) => setCmcDd(sanitizeNonNegative(value, 0))}
                onFocus={(e) => e.target.value === '0' && e.target.select()}
              />
            </Field>
            <DerivedBox>
              <div>
                Annual CMC cost: <strong className="text-[#1F4E79]">{fmtCost(calculations.cmcGross)}</strong>
              </div>
              <div>
                Residual downtime under CMC: <strong className="text-slate-700">{fmtCost(calculations.cmcDowntime)}</strong>
              </div>
              <div className="mt-2 border-t border-slate-200 pt-2 font-lufga-bold">
                Total CMC cost: <strong className="text-[#1F4E79]">{fmtCost(calculations.cmcTotal)}</strong>
              </div>
            </DerivedBox>
             {/* <DerivedBox>
              <div className="font-lufga-bold text-green-500 text-[18px]">
                Additional Features of Absstem Shield CMC:
              </div>
              <div className='text-black-500'>
              <ul className="list-disc list-inside">
                <li>10-Year Warranty on Molecular Sieves</li>
                <li>Guaranteed Fixed Costs with Zero Hidden Charges</li>
                <li>Priority Support and Faster Response Times</li>
              </ul>
              </div>
            </DerivedBox> */}

          </Card>

        </div>

        <SectionPill label="Key results" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard label="Current annual cost" value={fmtCost(calculations.current)} color="var(--red)" />
          <MetricCard label="CMC annual cost" value={fmtCost(calculations.cmcTotal)} />
          <MetricCard
            label={calculations.annualSavings >= 0 ? 'Annual saving' : 'Extra cost'}
            value={fmtCost(Math.abs(calculations.annualSavings))}
            color={calculations.annualSavings >= 0 ? 'var(--green)' : 'var(--red)'}
          />
          <MetricCard label="5-year saving" value={fmtCost(Math.abs(calculations.save5yr))} color={calculations.save5yr >= 0 ? 'var(--green)' : 'var(--red)'} />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        
          <MetricCard label="CMC over 5 years" value={fmtCost(calculations.cmcGross * 5)} />
        </div>

        <Verdict type={verdictType}>{verdictText}</Verdict>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card className="bg-white">
            <div className="text-[14px] font-lufga-bold text-[#1F4E79]">Cost Comparison by Category</div>
            <div className="mb-3 flex flex-wrap gap-6 text-[12px] text-slate-600">
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-8 rounded-full bg-[#E24B4A]" />
                <span>
                  <span className="font-lufga-bold text-[#E24B4A]">Current</span>
                  <span className="ml-1 text-slate-500">{fmtCost(calculations.current)} per year</span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-8 rounded-full bg-[#3B6D11]" />
                <span>
                  <span className="font-lufga-bold text-[#3B6D11]">Under CMC</span>
                  <span className="ml-1 text-slate-500">{fmtCost(calculations.cmcTotal)} per year</span>
                </span>
              </span>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calculations.chartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name"  label={{ value: "Year", position: "insideBottom", offset: -4 }}  interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => fmtK(Number(value))} width={78} />
                  <Tooltip formatter={(value: number) => fmtCost(value)} />
                  <Bar dataKey="current" name="Current ad-hoc cost" fill="#E24B4A" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="cmc" name="Under CMC" fill="#3B6D11" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Current vs CMC over 5 years" className="bg-white">
            <div className="mb-3 flex flex-wrap gap-6 text-[14px] text-[#1F4E79]">
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-8 rounded-full bg-[#E24B4A]" />
                <span>
                  <span className="font-lufga-bold text-[#E24B4A]">Current</span>
                  <span className="ml-1 text-slate-500">{fmtCost(calculations.current * 5)} over 5 yrs</span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-8 rounded-full bg-[#3B6D11]" />
                <span>
                  <span className="font-lufga-bold text-[#3B6D11]">Under CMC</span>
                  <span className="ml-1 text-slate-500">{fmtCost(calculations.cmcTotal * 5)} over 5 yrs</span>
                </span>
              </span>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={calculations.lineChartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="year" 
                    label={{ value: "Year", position: "insideBottom", offset: -4 }} 
                  />
                  <YAxis tickFormatter={(value) => fmtLakh(Number(value))} width={78} />
                  <Tooltip formatter={(value: number) => fmtCost(value)} />
                  <Line type="monotone" dataKey="current" name="Current" stroke="#E24B4A" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="cmc" name="Under CMC" stroke="#3B6D11" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="bg-white">
          <div className="text-[19px] font-lufga-bold text-[#1F4E79]">Detailed cost breakdown</div>
          <BreakdownTable rows={calculations.tableRows} />
        </Card>
      </div>

      <div className="print:hidden">
        <ReportLayoutShield
          ref={reportRef}
          title="Existing Maintenance vs Absstem Shield Premium"
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-green-200 bg-white p-4 text-center shadow-sm">
                  <div className="mb-2 text-[28px] font-lufga-bold text-green-600">{fmtCost(calculations.annualSavings)}</div>
                  <div className="text-sm text-green-800 font-lufga-regular">Annual Operating Cost Savings</div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-white p-4 text-center shadow-sm">
                  <div className="mb-2 text-[28px] font-lufga-bold text-blue-600">{fmtCost(calculations.save5yr)}</div>
                  <div className="text-sm text-blue-800 font-lufga-regular">Total 5-Year Savings</div>
                </div>
                {/* <div className="rounded-lg border border-violet-200 bg-white p-4 text-center shadow-sm">
                  <div className="mb-2 text-[28px] font-lufga-bold text-violet-600">
                    {roiMetrics.roiPercentage !== null ? `${roiMetrics.roiPercentage.toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-violet-800 font-lufga-regular">Return on Investment</div>
                </div> */}
              </div>
            </Card>

            <Card title="Cost Comparison Charts" className="bg-white">
              <div className="space-y-6">
                <div>
                  <div className="mb-3 text-sm font-lufga-bold text-[#1F4E79] text-[14px]">Cost comparison by category</div>
                  <div className="mb-2 flex flex-wrap gap-4 text-[11px] text-slate-600">
                    <span className="flex items-center gap-2 text-[15px]">
                      <span className="inline-block h-2.5 w-6 rounded-full bg-[#E24B4A]" />
                      <span><span className="font-lufga-bold text-[#E24B4A] text-[15px]">Current</span> — {fmtCost(calculations.current)} per year</span>
                    </span>
                    <span className="flex items-center gap-2 text-[15px]">
                      <span className="inline-block h-2.5 w-6 rounded-full bg-[#3B6D11]" />
                      <span><span className="font-lufga-bold text-[#3B6D11] text-[15px]">Under CMC</span> — {fmtCost(calculations.cmcTotal)} per year</span>
                    </span>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={calculations.chartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name"  label={{ value: "Year", position: "insideBottom", offset: -4 }}  interval={0} tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(value) => fmtK(Number(value))} width={78} />
                        <Tooltip formatter={(value: number) => fmtCost(value)} />
                        <Bar dataKey="current" name="Current ad-hoc cost" fill="#E24B4A" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                        <Bar dataKey="cmc" name="Under CMC" fill="#3B6D11" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <div className="mb-3 text-sm font-lufga-bold text-[#1F4E79]">Current vs CMC over 5 years</div>
                  <div className="mb-2 flex flex-wrap gap-4 text-[11px] text-slate-600">
                    <span className="flex items-center gap-2 text-[15px]">
                      <span className="inline-block h-2.5 w-6 rounded-full bg-[#E24B4A]" />
                      <span><span className="font-lufga-bold text-[#E24B4A] text-[15px]">Current</span> — {fmtCost(calculations.current * 5)} over 5 yrs</span>
                    </span>
                    <span className="flex items-center gap-2 text-[15px]">
                      <span className="inline-block h-2.5 w-6 rounded-full bg-[#3B6D11]" />
                      <span><span className="font-lufga-bold text-[#3B6D11] text-[15px]">Under CMC</span> — {fmtCost(calculations.cmcTotal * 5)} over 5 yrs</span>
                    </span>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={calculations.lineChartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="year" />
                        <YAxis tickFormatter={(value) => fmtLakh(Number(value))} width={78} />
                        <Tooltip formatter={(value: number) => fmtCost(value)} />
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
              <div className="space-y-3 text-justify text-[14px] leading-7 text-slate-700 font-lufga-regular">
                <p>
                  This comparison shows the lifecycle impact of upgrading from a standalone PSA maintenance approach to an Absstem Shield CMC contract.
                  The projected annual operating-cost difference is <span className="font-lufga-bold text-green-700">{fmtCost(calculations.annualSavings)}</span>, with a five-year savings impact of{' '}
                  <span className="font-lufga-bold text-green-700">{fmtCost(calculations.save5yr)}</span>.
                </p>
                <p>
                  Beyond direct operating cost, the CMC option reduces breakdown downtime and simplifies upkeep by bundling preventive maintenance,
                  spares and response coverage into one contract.
                </p>
                <p className="font-lufga-bold text-[#1F4E79]">
                  Recommendation: Use CMC when the service coverage and downtime reduction justify the annual contract cost.
                </p>
                 <div className="font-lufga-bold text-green-500 text-[18px]">
                Additional Features of Absstem Shield CMC:
              </div>
              <div className='text-black-500'>
              <ul className="list-disc list-inside">
                <li>10-Year Warranty on Molecular Sieves</li>
                <li>Guaranteed Fixed Costs with Zero Hidden Charges</li>
                <li>Priority Support and Faster Response Times</li>
              </ul>
              </div>
              </div>
            </Card>

            <Card title="10-Year Cumulative Savings" className="bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-[13px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-lufga-bold uppercase tracking-[0.08em] text-slate-500">Item</th>
                      <th className="px-4 py-3 text-right text-[11px] font-lufga-bold uppercase tracking-[0.08em] text-slate-500">Current</th>
                      <th className="px-4 py-3 text-right text-[11px] font-lufga-bold uppercase tracking-[0.08em] text-slate-500">Under CMC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.tableRows.map((row, index) => {
                      const rowBg = row.isTotalSavings
                        ? '#dcfce7'
                        : row.section
                          ? '#dbeafe'
                          : index % 2 === 0
                            ? '#ffffff'
                            : '#f8fafc';
                      const cellColor = row.isTotalSavings
                        ? '#15803d'
                        : row.section
                          ? '#1F4E79'
                          : '#334155';
                      const fontWeight = (row.section || row.isTotalSavings) ? 700 : 400;
                      const rowClass = row.isTotalSavings
                        ? 'pdf-row-total'
                        : row.section
                          ? 'pdf-row-section'
                          : index % 2 === 0
                            ? 'pdf-row-even'
                            : 'pdf-row-odd';
                      return (
                        <tr key={`report-row-${index}`} className={rowClass} style={{ backgroundColor: rowBg, borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 16px', color: cellColor, fontWeight, fontSize: 13 }}>{row.label}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: cellColor, fontWeight, fontSize: 13 }}>{row.current}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: cellColor, fontWeight, fontSize: 13 }}>{row.cmc}</td>
                        </tr>
                      );
                    })}
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