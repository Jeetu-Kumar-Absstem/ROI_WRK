// src/components/cmc/Calculator2.tsx
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
import { ReportLayoutShield } from '../ReportLayoutShield';
import { Card, DerivedBox, Field, MetricCard, NumberInput, TextInput, Verdict, SectionPill } from './UI';
import { fmtINR, fmtLakh, n2f,formatNumber } from './format';
import { VolumeUnit, getUnitDisplay, getUnitSuperscript, convertToNm3, convertFromNm3 } from './conversions';


const fmtCost = (v: number) => `${fmtINR(v)}/-`;

// Custom tooltip for the floating-bar Yearly Cost Comparison chart.
// Reads the true value from the data point (not the stacked offset) so the
// "Savings" bar — which floats on an invisible base — still shows its real amount.
const BAR_SERIES_META: Record<string, { label: string; color: string }> = {
  oxygen: { label: 'Oxygen Current Year Cost', color: '#E24B4A' },
  psaCost: { label: 'PSA Operational Cost', color: '#2563EB' },
  savings: { label: 'Savings', color: '#EAB308' },
};

// Custom tooltip for the stacked Yearly Cost Comparison chart.
// Shows every non-zero segment in the hovered bar (e.g. the 2nd bar shows
// both "PSA Operational Cost" and "Savings" since they're stacked together).
function BarTooltipContent({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const rows = payload.filter((p: any) => BAR_SERIES_META[p.dataKey] && Number(p.value) > 0);
  if (!rows.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>{label}</div>
      {rows.map((p: any) => {
        const meta = BAR_SERIES_META[p.dataKey];
        return (
          <div key={p.dataKey} style={{ color: meta.color, fontWeight: 700 }}>
            {meta.label}: {fmtCost(Number(p.value))}
          </div>
        );
      })}
    </div>
  );
}

type CostMode = 'new' | 'repair';
type PrintMeta = {
  client: string;
  by: string;
  plant: string;
};
type ComparisonType = 'cylinder' | 'liquid';

const UNIT_OPTIONS: VolumeUnit[] = ['Nm3', 'Sm3', 'Liters', 'Kg'];

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
  const [comparisonType, setComparisonType] = useState<ComparisonType>('cylinder');
  
  // Daily Use
  const [dailyUseValue, setDailyUseValue] = useState(10000);
  const [dailyUseUnit, setDailyUseUnit] = useState<VolumeUnit>('Sm3');
  
  // Gas cost
  const [gasCostValue, setGasCostValue] = useState(15);
  const [gasCostUnit, setGasCostUnit] = useState<VolumeUnit>('Nm3');
  
  const [oxyEsc, setOxyEsc] = useState(7);
  const [annualRentalCost, setAnnualRentalCost] = useState(25000);
  const [powerPerM3, setPowerPerM3] = useState(1.1);
  const [elecRate, setElecRate] = useState(8);
  const [costMode, setCostMode] = useState<CostMode>('new');
  const [plantCost, setPlantCost] = useState(4599820);
  const [cmcYr, setCmcYr] = useState(425000);
  const [plantLife, setPlantLife] = useState(10);
  
  // Cylinder specific
  const [gasPerCylinder, setGasPerCylinder] = useState(7);
  const [costPerCylinder, setCostPerCylinder] = useState(400);
  const [cylindersPerDay, setCylindersPerDay] = useState(70);

  // Helper to get daily use in Nm³
  const dailyUseNm3 = useMemo(() => {
    return convertToNm3(dailyUseValue, dailyUseUnit);
  }, [dailyUseValue, dailyUseUnit]);

  // Helper to get gas cost per Nm³
  const gasCostPerNm3 = useMemo(() => {
    return gasCostValue / convertToNm3(1, gasCostUnit);
  }, [gasCostValue, gasCostUnit]);

  const calculations = useMemo(() => {
    let gasPerDay: number;
    let unitPriceOxy: number;
    let oxyMonthCost: number;
    
    if (comparisonType === 'cylinder') {
      // Cylinder mode
      gasPerDay = cylindersPerDay * gasPerCylinder;
      unitPriceOxy = costPerCylinder / gasPerCylinder;
      oxyMonthCost = cylindersPerDay * costPerCylinder * 30;
    } else {
      // Liquid mode - using daily use
      gasPerDay = dailyUseNm3;
      unitPriceOxy = gasCostPerNm3;
      oxyMonthCost = dailyUseNm3 * gasCostPerNm3 * 30;
    }
    
    const gasPerMonth = gasPerDay * 30;
    const gasPerHr = gasPerDay / 24;
    
    // PSA Plant Flow rate = Daily use / 24
    const plantFlow = gasPerDay / 24;
    
    // Total plant power draw = Plant flow rate * Power per m³
    const totalPowerKW = plantFlow * powerPerM3;
    
    // Electricity per month
    const elecPerMonth = totalPowerKW * elecRate * 24 * 30;
    
    const unitPricePSA = powerPerM3 * elecRate;
    const savingPerM3 = unitPriceOxy - unitPricePSA;
    const monthlySaving = savingPerM3 * gasPerMonth;
    const yearlySaving = monthlySaving * 12 - cmcYr;
    
    const cmcTotal = cmcYr * (plantLife - 1);
    const roiYears = yearlySaving > 0 ? plantCost / yearlySaving : Infinity;
    const roiMonths = roiYears * 12;
    const totalSaving = yearlySaving * plantLife - cmcYr- plantCost;
    
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
    
    // Yearly cost comparison data
    // Rental cost only applies in "vs Liquid" mode (tank/equipment rental).
    // In "vs Cylinder" mode there is no separate rental charge.
    const yearlyOxygenCost = oxyMonthCost * 12 + (comparisonType === 'liquid' ? annualRentalCost : 0);
    const yearlyPSAGasCost = elecPerMonth * 12+cmcYr;
    const yearlySavings = yearlySaving;
    
    // Two bars: the 1st is the Oxygen cost on its own; the 2nd stacks the PSA
    // operational cost (blue) with the Savings (yellow) on top of it, so the
    // stacked total reads as "PSA Operational Cost + Savings".
    const barData = [
      { name: 'Oxygen Current Year Cost', oxygen: yearlyOxygenCost, psaCost: 0, savings: 0 },
      { name: 'PSA Operational Cost + Savings', oxygen: 0, psaCost: yearlyPSAGasCost, savings: yearlySavings },
    ];
    const barLegend = [
      { key: 'oxygen', name: 'Oxygen Current Year Cost', color: '#E24B4A', value: yearlyOxygenCost, lightBg: 'bg-red-50', lightBorder: 'border-red-100' },
      { key: 'psaCost', name: 'PSA Operational Cost', color: '#2563EB', value: yearlyPSAGasCost, lightBg: 'bg-blue-50', lightBorder: 'border-blue-100' },
      { key: 'savings', name: 'Savings', color: '#EAB308', value: yearlySavings, lightBg: 'bg-yellow-50', lightBorder: 'border-yellow-100' },
    ];
    
    // Cumulative cost over plant life
    const yLabels = ['Now'];
    const buyCumul = [0];
    const psaCumul = [plantCost];
    let buySum = 0;
    let psaSum = plantCost;
    
    for (let year = 1; year <= plantLife; year += 1) {
      yLabels.push(`Yr ${year}`);
      const oxyThis = oxyMonthCost * 12 * Math.pow(1 + oxyEsc / 100, year - 1);
      buySum += oxyThis + (comparisonType === 'liquid' ? annualRentalCost : 0);
      psaSum += elecPerMonth * 12 + (year === 1 ? 0 : cmcYr);
      buyCumul.push(Math.round(buySum));
      psaCumul.push(Math.round(psaSum));
    }
   
    
    const lineChartData = yLabels.map((label, index) => ({
      label,
      buy: buyCumul[index],
      psa: psaCumul[index],
    }));
    
    const verdictType = totalSaving >= 0 ? 'save' : 'loss';
    const verdictText =
      totalSaving >= 0
        ? `PSA plant can save ${fmtCost(monthlySaving)} per month. Over ${plantLife} years, the projected total saving is ${fmtCost(totalSaving)}.`
        : `Over ${plantLife} years, buying oxygen is cheaper by ${fmtCost(Math.abs(totalSaving))}. Review inputs.`;
    
    return {
      comparisonType,
      dailyUseValue,
      dailyUseUnit,
      dailyUseNm3,
      gasCostValue,
      gasCostUnit,
      gasCostPerNm3,
      cylindersPerDay,
      gasPerCylinder,
      costPerCylinder,
      gasPerDay,
      gasPerMonth,
      gasPerHr,
      unitPriceOxy,
      oxyMonthCost,
      yearlyOxygenCost,
      yearlyPSAGasCost,
      yearlySavings,
      plantFlow,
      powerPerM3,
      totalPowerKW,
      elecRate,
      elecPerMonth,
      unitPricePSA,
      savingPerM3,
      monthlySaving,
      yearlySaving,
      plantCost,
      costMode,
      cmcYr,
      cmcTotal,
      plantLife,
      roiYears,
      roiMonths,
      totalSaving,
      roiLabel,
      roiSheetValue,
      roiSheetUnit,
      barData,
      barLegend,
      lineChartData,
      verdictType,
      verdictText,
    };
  }, [comparisonType, cylindersPerDay, gasPerCylinder, costPerCylinder, dailyUseNm3, gasCostPerNm3, powerPerM3, elecRate, plantCost, cmcYr, plantLife, oxyEsc, annualRentalCost]);

  const reportTitle =
    costMode === 'new'
      ? 'New Plant Purchase vs Buying Oxygen'
      : 'Repair / Revamp vs Buying Oxygen';

  const reportSummary = (
    <p className="text-justify">
      This report compares buying oxygen externally against a PSA plant, and includes the investment and CMC impact over plant life.
      The calculation includes monthly savings, ROI period and cumulative cost analysis.
    </p>
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
  
  .border-table { 
    border: 1px solid #e2e8f0; 
  }
`}</style>
      
      <div className="mb-4 flex justify-end print:hidden">
        <DownloadPdfButton
          contentToPrint={reportRef}
          tabName="CMC_CALCULATOR_2"
          letterheadPath="/absstem_shield_letterhead.jpg"
          inputs={{
            meta,
            comparisonType,
            dailyUseValue,
            dailyUseUnit,
            gasCostValue,
            gasCostUnit,
            cylindersPerDay,
            gasPerCylinder,
            costPerCylinder,
            oxyEsc,
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
        <p className="text-[19px] font-lufga-bold text-[#1F4E79]">{reportTitle}</p>
        <p className="text-[14px] text-black-500 font-lufga-regular">
          Based on Absstem's ROI logic. It calculates monthly saving, ROI period and total saving over the plant life.
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setComparisonType('cylinder')}
            className={`rounded-lg border px-4 py-2 text-[14px] transition font-lufga-regular ${
              comparisonType === 'cylinder' ? 'border-[#1F4E79] bg-[#1F4E79] text-white' : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            vs Cylinders
          </button>
          <button
            type="button"
            onClick={() => setComparisonType('liquid')}
            className={`rounded-lg border px-4 py-2 text-[14px] transition font-lufga-regular ${
              comparisonType === 'liquid' ? 'border-[#1F4E79] bg-[#1F4E79] text-white' : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            vs Liquid
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          <Card className="bg-white">
            <div className="text-[17px] font-lufga-bold text-[#1F4E79] ">Oxygen Purchase (Current)</div>
            {comparisonType === 'liquid' ? (
              <>
                <Field label="Daily Use" hint="Cannot be less than 0">
                  <div className="flex gap-2">
                    <NumberInput 
                      value={dailyUseValue} 
                      min={0} 
                      step={100} 
                      onChange={(value) => setDailyUseValue(sanitizeNonNegative(value, 0))}
                      onFocus={(e) => e.target.value === '0' && e.target.select()}
                      className="flex-1"
                    />
                    <select
                      value={dailyUseUnit}
                      onChange={(e) => setDailyUseUnit(e.target.value as VolumeUnit)}
                      className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 font-lufga-regular"
                    >
                      {UNIT_OPTIONS.map(unit => (
                        <option key={unit} value={unit}>{getUnitDisplay(unit)}</option>
                      ))}
                    </select>
                  </div>
                </Field>
                <DerivedBox>
                  <div>
                    Daily Use in <span className="font-lufga-bold">Nm³</span>: <strong className="text-slate-700">{dailyUseNm3.toFixed(2)}</strong>
                  </div>
                </DerivedBox>
                <Field label="Gas cost per" hint="Current oxygen price">
                  <div className="flex gap-2">
                    <NumberInput 
                      value={gasCostValue} 
                      min={0} 
                      step={1} 
                      onChange={(value) => setGasCostValue(sanitizeNonNegative(value, 0))}
                      onFocus={(e) => e.target.value === '0' && e.target.select()}
                      className="flex-1"
                    />
                    <select
                      value={gasCostUnit}
                      onChange={(e) => setGasCostUnit(e.target.value as VolumeUnit)}
                      className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 font-lufga-regular"
                    >
                      {UNIT_OPTIONS.map(unit => (
                        <option key={unit} value={unit}>{getUnitDisplay(unit)}</option>
                      ))}
                    </select>
                  </div>
                </Field>
                <DerivedBox>
                 <div>
  Cost per <span className="font-lufga-bold">Nm³</span>: 
  <strong className="text-slate-700">{formatNumber(calculations.gasCostPerNm3, 2)}</strong>
</div>
                </DerivedBox>
              </>
            ) : (
              <>
                <Field label="Cylinders consumed per day" hint="Average actual cylinders used per day">
                  <NumberInput 
                    value={cylindersPerDay} 
                    min={0} 
                    step={5} 
                    onChange={(value) => setCylindersPerDay(sanitizeNonNegative(value, 0))}
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
                  />
                </Field>
                <Field label="Gas per cylinder (m³)">
                  <NumberInput 
                    value={gasPerCylinder} 
                    min={0} 
                    step={0.5} 
                    onChange={(value) => setGasPerCylinder(sanitizeNonNegative(value, 0))}
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
                  />
                </Field>
                <Field label="Cost per cylinder ₹">
                  <NumberInput 
                    value={costPerCylinder} 
                    min={0} 
                    step={10} 
                    onChange={(value) => setCostPerCylinder(sanitizeNonNegative(value, 0))}
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
                  />
                </Field>
              </>
            )}
            <Field label="Annual oxygen price escalation (%)" hint="Typical 5–10% per year">
              <NumberInput 
                value={oxyEsc} 
                min={0} 
                max={30} 
                step={1} 
                onChange={(value) => setOxyEsc(sanitizeNonNegative(value, 0))}
                onFocus={(e) => e.target.value === '0' && e.target.select()}
              />
            </Field>
            {comparisonType === 'liquid' && (
              <Field
                label="Annual Rental Cost ₹"
                hint="Annual tank/equipment rental for liquid supply"
              >
                <NumberInput
                  value={annualRentalCost}
                  min={0}
                  step={1000}
                  onChange={(value) => setAnnualRentalCost(sanitizeNonNegative(value, 0))}
                  onFocus={(e) => e.target.value === '0' && e.target.select()}
                />
              </Field>
            )}
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
              <div>
                Monthly oxygen expense: <strong className="text-[#A32D2D]">{fmtCost(calculations.oxyMonthCost)}</strong>
              </div>
            </DerivedBox>
          </Card>

          <Card className="bg-white">
            <div className="text-[16px] font-lufga-bold text-[#1F4E79]">PSA Oxygen Plant</div>
            <Field label="PSA plant flow rate (m³/hr)" hint="Auto-calculated = Daily use / 24">
              <NumberInput value={calculations.plantFlow.toFixed(2)} readOnly />
            </Field>
            <Field label="Power per m³ of oxygen produced (kW)" hint="Typically 1.0–1.2 kW/m³ for PSA plants">
              <NumberInput 
                value={powerPerM3} 
                min={0} 
                max={3} 
                step={0.1} 
                onChange={(value) => setPowerPerM3(sanitizeNonNegative(value, 0))}
                onFocus={(e) => e.target.value === '0' && e.target.select()}
              />
            </Field>
            <Field label="Total plant power draw (kW) — auto" hint="Auto-calculated = flow × kW/m³">
              <NumberInput value={calculations.totalPowerKW.toFixed(2)} readOnly />
            </Field>
            <Field label="Electricity cost ₹ per kWh (unit)">
              <NumberInput 
                value={elecRate} 
                min={0} 
                max={25} 
                step={0.5} 
                onChange={(value) => setElecRate(sanitizeNonNegative(value, 0))}
                onFocus={(e) => e.target.value === '0' && e.target.select()}
              />
            </Field>
            <DerivedBox>
              <div>
                PSA Operational Cost Monthly: <strong className="text-slate-700">{fmtCost(calculations.elecPerMonth)}</strong>
              </div>
              <div>
                PSA unit price: <strong className="text-[#3B6D11]">{fmtCost(calculations.unitPricePSA)}/m³</strong>
              </div>
              <div>
                Saving per m³: <strong className="text-[#3B6D11]">{fmtCost(calculations.savingPerM3)}</strong>
              </div>
            </DerivedBox>
          </Card>

          <Card  className="bg-white">
            <div className="text-[16px] font-lufga-bold text-[#1F4E79]">Plant Investment & CMC Now</div>
            <Field label="Cost type">
              <select
                value={costMode}
                onChange={(event) => setCostMode(event.target.value as CostMode)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 font-lufga-regular"
              >
                <option value="new">New plant purchase</option>
                <option value="repair">Repair / revamp of existing plant</option>
              </select>
            </Field>
            <Field label={costMode === 'new' ? 'Plant purchase cost ₹' : 'Repair / restoration cost ₹'} hint={costMode === 'new' ? 'Ex-factory price excluding GST' : 'Labour + spares for complete restoration'}>
              <NumberInput 
                value={plantCost} 
                min={0} 
                step={50000} 
                onChange={(value) => setPlantCost(sanitizeNonNegative(value, 0))}
                onFocus={(e) => e.target.value === '0' && e.target.select()}
              />
            </Field>
            <Field label="CMC charges per year ₹ " hint="Absstem Shield Premium CMC annual value">
              <NumberInput 
                value={cmcYr} 
                min={0} 
                step={5000} 
                onChange={(value) => setCmcYr(sanitizeNonNegative(value, 0))}
                onFocus={(e) => e.target.value === '0' && e.target.select()}
              />
            </Field>
            <Field label="Plant life (years)" hint="Typically 10 years for a PSA plant">
              <NumberInput 
                value={plantLife} 
                min={1} 
                max={20} 
                step={1} 
                onChange={(value) => setPlantLife(Math.max(1, sanitizeNonNegative(value, 1)))}
                onFocus={(e) => e.target.value === '0' && e.target.select()}
              />
            </Field>
            <DerivedBox>
              <div>
                CMC over {calculations.plantLife} years: <strong className="text-slate-700">{fmtCost(calculations.cmcTotal)}</strong>
              </div>
            </DerivedBox>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard label="Monthly saving by using PSA" value={fmtCost(calculations.monthlySaving)} color="var(--green)" />
          <MetricCard label="Oxygen Current Year Cost" value={fmtCost(calculations.yearlyOxygenCost)} color="var(--red)" />
          <MetricCard label="PSA Yearly Cost=Operational Cost+CMC" value={fmtCost(calculations.elecPerMonth * 12+calculations.cmcYr)} color="var(--amber)" />
          
          <MetricCard label="Yearly saving by using PSA" value={fmtCost(calculations.yearlySaving)} color="var(--green)" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard label="ROI period" value={calculations.roiLabel} color="var(--navy)" />
          <MetricCard label={`Total saving over ${calculations.plantLife} years`} value={fmtCost(calculations.totalSaving)} color={calculations.totalSaving >= 0 ? 'var(--green)' : 'var(--red)'} />
          <MetricCard label={`CMC over ${calculations.plantLife} years`} value={fmtCost(calculations.cmcTotal)} />
        </div>

        <Verdict type={calculations.totalSaving >= 0 ? 'save' : 'loss'}>{calculations.verdictText}</Verdict>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card  className="bg-white">
            <div className="text-[16px] font-lufga-bold text-[#1F4E79]">Yearly Cost Comparison</div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calculations.barData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => fmtLakh(Number(value))} width={78} />
                  <Tooltip content={<BarTooltipContent />} />
                  <Bar dataKey="oxygen" stackId="cost" name="Oxygen Current Year Cost" fill="#E24B4A" radius={[8, 8, 0, 0]} barSize={90} isAnimationActive={false} />
                  <Bar dataKey="psaCost" stackId="cost" name="PSA Operational Cost" fill="#2563EB" barSize={60} isAnimationActive={false} />
                  <Bar dataKey="savings" stackId="cost" name="Savings" fill="#EAB308" radius={[8, 8, 0, 0]} barSize={60} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {calculations.barLegend.map((entry) => (
                <div key={entry.key} className={`flex items-center gap-2 rounded-lg border ${entry.lightBorder} ${entry.lightBg} px-3 py-1.5`}>
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                  <span className="text-[12px] text-slate-600">{entry.name}</span>
                  <span className="text-[12px] font-lufga-bold" style={{ color: entry.color }}>{fmtLakh(entry.value)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="bg-white">
            <div className="text-[16px] font-lufga-bold text-[#1F4E79]">Cumulative cost over plant life</div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.lineChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => fmtLakh(Number(value))} width={78} />
                  <Tooltip formatter={(value: number) => fmtCost(value)} />
                  <Line type="monotone" dataKey="buy" name="Buy Oxygen" stroke="#E24B4A" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="psa" name="PSA plant total" stroke="#3B6D11" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {(() => {
              const last = calculations.lineChartData[calculations.lineChartData.length - 1];
              return (
                <div className="mt-3 flex flex-wrap justify-center gap-6">
                  <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5">
                    <span className="inline-block h-3 w-3 rounded-sm bg-[#E24B4A]" />
                    <span className="text-[12px] text-slate-600">Buy Oxygen</span>
                    <span className="text-[12px] font-lufga-bold text-[#E24B4A]">{fmtLakh(last.buy)} (Yr {calculations.plantLife})</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-1.5">
                    <span className="inline-block h-3 w-3 rounded-sm bg-[#3B6D11]" />
                    <span className="text-[12px] text-slate-600">PSA plant total</span>
                    <span className="text-[12px] font-lufga-bold text-[#3B6D11]">{fmtLakh(last.psa)} (Yr {calculations.plantLife})</span>
                  </div>
                </div>
              );
            })()}
          </Card>
        </div>

        <Card  className="bg-white">
          <div className="text-[19px] font-lufga-bold text-[#1F4E79]">Full Calculation Sheet</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-200 text-[13px]">
              <thead>
                <tr className="bg-rose-300">
                  <th className="border border-slate-200 px-3 py-2 text-left text-[11px] font-lufga-bold uppercase tracking-[0.08em] text-slate-500">Parameter</th>
                  <th className="border border-slate-200 px-3 py-2 text-left text-[11px] font-lufga-bold uppercase tracking-[0.08em] text-slate-500">UOM</th>
                  <th className="border border-slate-200 px-3 py-2 text-right text-[11px] font-lufga-bold uppercase tracking-[0.08em] text-slate-500">Value</th>
                </tr>
              </thead>
              <tbody>
                {/* OXYGEN PURCHASE (CURRENT) Section */}
                <tr className="bg-green-300">
                  <td colSpan={3} className="border border-slate-200 px-3 py-2 font-lufga-bold text black">OXYGEN PURCHASE (CURRENT)</td>
                </tr>
                {comparisonType === 'cylinder' ? (
                  <>
                    <tr>
                      <td className="border border-slate-200 px-3 py-2 text-slate-700">Oxygen cylinders per day</td>
                      <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">Nos</td>
                      <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{calculations.cylindersPerDay}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 px-3 py-2 text-slate-700">Gas per cylinder</td>
                      <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">m³</td>
                      <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{calculations.gasPerCylinder}</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td className="border border-slate-200 px-3 py-2 text-slate-700">Daily Use</td>
                      <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">{getUnitDisplay(calculations.dailyUseUnit)}</td>
                      <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{calculations.dailyUseValue}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 px-3 py-2 text-slate-700">Daily Use in Nm³</td>
                      <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">Nm³</td>
                      <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{calculations.dailyUseNm3.toFixed(2)}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">Per Hour Oxygen Consumption</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">m³/hr</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{calculations.gasPerHr.toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">Oxygen gas used / Month</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">m³</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{calculations.gasPerMonth.toFixed(0)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">Unit price per m³ (current)</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">₹/m³</td>
                  <td className="border border-slate-200 px-3 py-2 text-right font-lufga-bold text-slate-900">{fmtINR(calculations.unitPriceOxy)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">Monthly Oxygen Expense</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">₹</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{fmtCost(calculations.oxyMonthCost)}</td>
                </tr>
                {comparisonType === 'liquid' && (
                  <tr>
                    <td className="border border-slate-200 px-3 py-2 text-slate-700">Annual Rental Cost</td>
                    <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">₹</td>
                    <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{fmtCost(annualRentalCost)}</td>
                  </tr>
                )}
                <tr>
                  <td className="border border-slate-200 px-3 py-2 font-lufga-bold text-slate-900">Oxygen Current Year Cost</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">₹</td>
                  <td className="border border-slate-200 px-3 py-2 text-right font-lufga-bold text-slate-900">{fmtCost(calculations.yearlyOxygenCost)}</td>
                </tr>

                {/* PSA OXYGEN PLANT Section */}
                <tr className="bg-green-300">
                  <td colSpan={3} className="border border-slate-200 px-3 py-2 font-lufga-bold text black">PSA OXYGEN PLANT</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">PSA plant flow rate</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">m³/hr</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{calculations.plantFlow.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">Power per m³ produced</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">kW</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{calculations.powerPerM3}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">Total plant power draw</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">kW</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{calculations.totalPowerKW.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">Electricity cost per kWh</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">₹</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{calculations.elecRate}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">Electricity expense per month</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">₹</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{fmtCost(calculations.elecPerMonth)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">Unit price per m³ (PSA)</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">₹/m³</td>
                  <td className="border border-slate-200 px-3 py-2 text-right font-lufga-bold text-slate-900">{fmtCost(calculations.unitPricePSA)}</td>
                </tr>

                {/* SAVINGS Section */}
                <tr className="bg-green-300">
                  <td colSpan={3} className="border border-slate-200 px-3 py-2 font-lufga-bold text black">SAVINGS</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">Monthly saving by using PSA</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">₹</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{fmtCost(calculations.monthlySaving)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">Yearly saving by using PSA</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">₹</td>
                  <td className="border border-slate-200 px-3 py-2 text-right font-lufga-bold text-slate-900">{fmtCost(calculations.yearlySaving)}</td>
                </tr>

                {/* ROI & INVESTMENT Section */}
                <tr className="bg-green-300">
                  <td colSpan={3} className="border border-slate-200 px-3 py-2 font-lufga-bold text black">ROI & INVESTMENT</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">{calculations.costMode === 'new' ? 'Oxygen plant purchase cost' : 'Plant repair / restoration cost'}</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">₹</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{fmtCost(calculations.plantCost)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">CMC charges per year</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">₹</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{fmtCost(calculations.cmcYr)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">Life of oxygen plant</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">Years</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{calculations.plantLife}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 text-slate-700">CMC charges for {calculations.plantLife} years</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-slate-500">₹</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{fmtCost(calculations.cmcTotal)}</td>
                </tr>
                <tr className="bg-cyan-300 ">
                  <td className="border border-slate-200 px-3 py-2 text-black-700 ">ROI period</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text-black-500">{calculations.roiSheetUnit}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right font-lufga-bold text-black-900">{calculations.roiSheetValue}</td>
                </tr>
                <tr className="bg-green-500">
                  <td className="border border-slate-200 px-3 py-2 font-lufga-bold text black">Total saving in {calculations.plantLife} years</td>
                  <td className="border border-slate-200 px-3 py-2 text-[12px] text black">₹</td>
                  <td className="border border-slate-200 px-3 py-2 text-right font-lufga-bold text black">{fmtCost(calculations.totalSaving)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="print:hidden">
        <ReportLayoutShield
          ref={reportRef}
          title={reportTitle}
          summary={reportSummary}
          pageOneContent={
  <div className="space-y-6">
    <Card title="Input Parameters" className="bg-white">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-2 text-slate-500 ">Client / Hospital name</div>
          <div className="text-lg font-lufga-bold text-slate-900">{meta.client || '—'}</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-2 text-slate-500">Prepared by</div>
          <div className="text-lg font-lufga-bold text-slate-900">{meta.by || '—'}</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-2 text-slate-500">Plant / Location</div>
          <div className="text-lg font-lufga-bold text-slate-900">{meta.plant || '—'}</div>
        </div>
      </div>
    </Card>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card title="Current Oxygen Purchase" className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="space-y-2 text-[16px] text-black-700">
          <div className="flex items-start justify-between gap-4">
            <span className="text-slate-500">Comparison type</span>
            <span className="font-lufga-bold text-[#1F4E79]">{comparisonType === 'cylinder' ? 'vs Cylinders' : 'vs Liquid'}</span>
          </div>
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
      <Card title="PSA Plant Specifications" className="border-slate-200 bg-white">
        <div className="space-y-2 text-[16px] text-black-700">
          <div className="flex items-start justify-between gap-4">
            <span>Plant flow rate</span>
            <span>{calculations.plantFlow.toFixed(2)} m³/hr</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span>Power per m³</span>
            <span>{calculations.powerPerM3} kW</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span>Electricity expense/month</span>
            <span>{fmtCost(calculations.elecPerMonth)}</span>
          </div>
        </div>
      </Card>
    </div>

    <Card title="Investment & CMC" className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 w-full">
      <div className="space-y-2 text-[16px] text-black-700">
        <div className="flex items-start justify-between gap-4">
          <span className="text-slate-500">Cost type</span>
          <span className="font-lufga-bold text-[#1F4E79]">{costMode === 'new' ? 'New plant purchase' : 'Repair / revamp of existing plant'}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span>{costMode === 'new' ? 'Plant purchase cost' : 'Repair / restoration cost'}</span>
          <span>{fmtCost(calculations.plantCost)}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span>CMC charges per year</span>
          <span>{fmtCost(calculations.cmcYr)}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span>Total saving in life cycle</span>
          <span>{fmtCost(calculations.totalSaving)}</span>
        </div>
      </div>
    </Card>

    {/* Saving cards below Investment & CMC */}
    <h2 className="text-lg font-lufga-bold text-black-700">Savings Analysis</h2>
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-lg border border-green-200 bg-white p-4 text-center shadow-sm">
        <div className="text-sm text-green-800 font-lufga-regular">Monthly Saving</div>
        <div className="mb-2 text-[28px] font-lufga-bold text-green-600">{fmtCost(calculations.monthlySaving)}</div>
      </div>
      <div className="rounded-lg border border-blue-200 bg-white p-4 text-center shadow-sm">
        <div className="text-sm text-blue-800 font-lufga-regular">Yearly Saving</div>
        <div className="mb-2 text-[28px] font-lufga-bold text-blue-600">{fmtCost(calculations.yearlySaving)}</div>
      </div>
    </div>

  </div>
}
        >
          <div className="print-page space-y-6">
            <Card title="Results Summary" className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* <div className="rounded-lg border border-green-200 bg-white p-4 text-center shadow-sm">
                   <div className="text-sm text-green-800 font-lufga-regular">Monthly Saving</div>
                  <div className="mb-2 text-[28px] font-lufga-bold text-green-600">{fmtCost(calculations.monthlySaving)}</div>
                 
                </div>
                <div className="rounded-lg border border-blue-200 bg-white p-4 text-center shadow-sm">
                  <div className="text-sm text-blue-800 font-lufga-regular">Yearly Saving</div>
                  <div className="mb-2 text-[28px] font-lufga-bold text-blue-600">{fmtCost(calculations.yearlySaving)}</div>
                  
                </div> */}
                <div className="rounded-lg border border-violet-300 bg-violet-100 p-4 text-center shadow-sm" style={{ backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }}>
                   <div className="text-sm text-violet-800 font-lufga-regular ">ROI Period</div>
                  <div className="mb-2 text-[28px] font-lufga-bold text-violet-600">{calculations.roiLabel}</div>
                 
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
                   <div className="text-sm text-slate-700 font-lufga-regular">Total Saving over {calculations.plantLife} years</div>
                  <div className="mb-2 text-[28px] font-lufga-bold text-slate-700">{fmtCost(calculations.totalSaving)}</div>
                 
                </div>
              </div>
            </Card>

            <Card title="Cost Comparison Charts" className="bg-white">
              <div className="space-y-6">
                <div>
                  <div className="mb-3 text-sm font-lufga-bold text-black-700">Yearly Cost Comparison</div>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={calculations.barData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(value) => fmtLakh(Number(value))} width={78} />
                        <Tooltip content={<BarTooltipContent />} />
                        <Bar dataKey="oxygen" stackId="cost" name="Oxygen Current Year Cost" fill="#E24B4A" radius={[8, 8, 0, 0]} barSize={80} isAnimationActive={false} />
                        <Bar dataKey="psaCost" stackId="cost" name="PSA Operational Cost" fill="#2563EB" barSize={80} isAnimationActive={false} />
                        <Bar dataKey="savings" stackId="cost" name="Savings" fill="#EAB308" radius={[8, 8, 0, 0]} barSize={80} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex flex-wrap justify-center gap-3">
                    {calculations.barLegend.map((entry) => (
                      <div key={entry.key} className={`flex items-center gap-2 rounded-lg border ${entry.lightBorder} ${entry.lightBg} px-3 py-1.5`}>
                        <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                        <span className="text-[11px] text-slate-600">{entry.name}</span>
                        <span className="text-[11px] font-lufga-bold" style={{ color: entry.color }}>{fmtLakh(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-3 text-sm font-lufga-bold text-black-700">Cumulative cost over plant life</div>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={calculations.lineChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="label" interval={0} tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(value) => fmtLakh(Number(value))} width={78} />
                        <Tooltip formatter={(value: number) => fmtCost(value)} />
                        <Line type="monotone" dataKey="buy" name="Buy Oxygen" stroke="#E24B4A" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                        <Line type="monotone" dataKey="psa" name="PSA plant total" stroke="#3B6D11" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {(() => {
                    const last = calculations.lineChartData[calculations.lineChartData.length - 1];
                    return (
                      <div className="mt-2 flex flex-wrap justify-center gap-5">
                        <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5">
                          <span className="inline-block h-3 w-3 rounded-sm bg-[#E24B4A]" />
                          <span className="text-[11px] text-slate-600">Buy Oxygen</span>
                          <span className="text-[11px] font-lufga-bold text-[#E24B4A]">{fmtLakh(last.buy)} (Yr {calculations.plantLife})</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-1.5">
                          <span className="inline-block h-3 w-3 rounded-sm bg-[#3B6D11]" />
                          <span className="text-[11px] text-slate-600">PSA plant total</span>
                          <span className="text-[11px] font-lufga-bold text-[#3B6D11]">{fmtLakh(last.psa)} (Yr {calculations.plantLife})</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </Card>
            <Card title="Business Case & Recommendation" className="bg-white">
              <div className="space-y-3 text-justify text-[14px] leading-7 text-black-700 font-lufga-regular">
                <p>
                  The PSA plant can deliver a monthly saving of <span className="font-lufga-bold text-green-700">{fmtCost(calculations.monthlySaving)}</span>{' '}
                  compared with buying oxygen. Over {calculations.plantLife} years, the projected total saving is{' '}
                  <span className="font-lufga-bold text-green-700">{fmtCost(calculations.totalSaving)}</span>.
                </p>
                <p>
                  The analysis also includes CMC charges of <span className="font-lufga-bold text-[#1F4E79]">{fmtCost(calculations.cmcTotal)}</span>{' '}
                  across the analysis period, which should be considered alongside plant purchase or revamp cost.
                </p>
                <p className="font-lufga-bold text-[#1F4E79]">
                  Recommendation: Choose the PSA plant where utility cost and savings justify the investment over the plant life.
                </p>
              </div>
            </Card>
          </div>

          <div className="print-page space-y-6">

            <Card title="Full calculation sheet" className="bg-white">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200 text-[13px]">
                  <thead>
                    <tr className="pdf-row-header2" style={{ backgroundColor: '#fda4af' }}>
                      <th style={{ border: '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>Parameter</th>
                      <th style={{ border: '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>UOM</th>
                      <th style={{ border: '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'OXYGEN PURCHASE (CURRENT)', uom: '', val: '', section: true },
                      { label: 'Comparison type', uom: '', val: comparisonType === 'cylinder' ? 'vs Cylinders' : 'vs Liquid', section: false, highlight: true },
                      ...(comparisonType === 'cylinder' 
                        ? [
                            { label: 'Oxygen cylinders per day', uom: 'Nos', val: calculations.cylindersPerDay.toString(), section: false },
                            { label: 'Gas per cylinder', uom: 'm³', val: calculations.gasPerCylinder.toString(), section: false },
                          ]
                        : [
                            { label: 'Daily Use', uom: getUnitDisplay(calculations.dailyUseUnit), val: calculations.dailyUseValue.toString(), section: false },
                            { label: 'Daily Use in Nm³', uom: 'Nm³', val: calculations.dailyUseNm3.toFixed(2), section: false },
                          ]
                      ),
                      { label: 'Per Hour Oxygen Consumption', uom: 'm³/hr', val: calculations.gasPerHr.toFixed(3), section: false },
                      { label: 'Oxygen gas used / Month', uom: 'm³', val: calculations.gasPerMonth.toFixed(0), section: false },
                      { label: 'Unit price per m³ (current)', uom: '₹/m³', val: fmtINR(calculations.unitPriceOxy), section: false, highlight: true },
                      { label: 'Monthly Oxygen Expense', uom: '₹', val: fmtCost(calculations.oxyMonthCost), section: false },
                      ...(comparisonType === 'liquid'
                        ? [{ label: 'Annual Rental Cost', uom: '₹', val: fmtCost(annualRentalCost), section: false }]
                        : []
                      ),
                      { label: 'Oxygen Current Year Cost', uom: '₹', val: fmtCost(calculations.yearlyOxygenCost), section: false, highlight: true },
                      { label: 'PSA OXYGEN PLANT', uom: '', val: '', section: true },
                      { label: 'PSA plant flow rate', uom: 'm³/hr', val: calculations.plantFlow.toFixed(2), section: false },
                      { label: 'Power per m³ produced', uom: 'kW', val: calculations.powerPerM3.toString(), section: false },
                      { label: 'Total plant power draw', uom: 'kW', val: calculations.totalPowerKW.toFixed(2), section: false },
                      { label: 'Electricity cost per kWh', uom: '₹', val: calculations.elecRate.toString(), section: false },
                      { label: 'Electricity expense per month', uom: '₹', val: fmtCost(calculations.elecPerMonth), section: false },
                      { label: 'Unit price per m³ (PSA)', uom: '₹/m³', val: fmtCost(calculations.unitPricePSA), section: false, highlight: true },
                      { label: 'SAVINGS', uom: '', val: '', section: true },
                      { label: 'Monthly saving by using PSA', uom: '₹', val: fmtCost(calculations.monthlySaving), section: false },
                      { label: 'Yearly saving by using PSA', uom: '₹', val: fmtCost(calculations.yearlySaving), section: false, highlight: true },
                      { label: 'ROI & INVESTMENT', uom: '', val: '', section: true },
                      { label: 'Cost type', uom: '', val: calculations.costMode === 'new' ? 'New plant purchase' : 'Repair / revamp of existing plant', section: false, highlight: true },
                      { label: calculations.costMode === 'new' ? 'Oxygen plant purchase cost' : 'Plant repair / restoration cost', uom: '₹', val: fmtCost(calculations.plantCost), section: false },
                      { label: 'CMC charges per year', uom: '₹', val: fmtCost(calculations.cmcYr), section: false },
                      { label: 'Life of oxygen plant', uom: 'Years', val: calculations.plantLife.toString(), section: false },
                      { label: `CMC charges for ${calculations.plantLife} years`, uom: '₹', val: fmtCost(calculations.cmcTotal), section: false },
                      { label: 'ROI period', uom: calculations.roiSheetUnit, val: calculations.roiSheetValue, section: false, highlight: true },
                      { label: `Total saving in ${calculations.plantLife} years`, uom: '₹', val: fmtCost(calculations.totalSaving), section: true, highlight: true, isTotal: true },
                    ].map((row, index) => {
                      const rowBg = row.isTotal
                        ? '#22c55e'
                        : row.section
                          ? '#86efac'
                          : '#ffffff';
                      const rowClass = row.isTotal
                        ? 'pdf-row-total2'
                        : row.section
                          ? 'pdf-row-section2'
                          : 'pdf-row-data2';
                      const textColor = (row.isTotal || row.section) ? '#000000' : '#334155';
                      const uomColor = (row.isTotal || row.section) ? '#000000' : '#64748b';
                      const fontWeight = (row.section || row.isTotal || row.highlight) ? 700 : 400;
                      if (row.section && !row.isTotal) {
                        return (
                          <tr key={`${row.label}-${index}`} className={rowClass} style={{ backgroundColor: rowBg }}>
                            <td colSpan={3} style={{ border: '1px solid #e2e8f0', padding: '8px 12px', color: textColor, fontWeight: 700, fontSize: 13 }}>{row.label}</td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={`${row.label}-${index}`} className={rowClass} style={{ backgroundColor: rowBg }}>
                          <td style={{ border: '1px solid #e2e8f0', padding: '8px 12px', color: textColor, fontWeight, fontSize: 13 }}>{row.label}</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '8px 12px', color: uomColor, fontSize: 12 }}>{row.uom}</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'right', color: textColor, fontWeight, fontSize: 13 }}>{row.val}</td>
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