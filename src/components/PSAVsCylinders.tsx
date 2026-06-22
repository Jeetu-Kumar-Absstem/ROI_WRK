import { useState, useEffect, useRef } from 'react';
import { Database, Zap, DollarSign, IndianRupee } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { CylinderInputs, CylinderResult, GAS_TYPES, CYLINDER_VOLUMES, LOAD_FACTORS, PURITIES, OXYGEN_PURITIES, INTEREST_RATES, DEPRECIATION_RATES, FLOW_DATA, OXYGEN_FLOW_DATA, COMPRESSOR_DATA } from '../types/calculator';
import { calculateCylinderRoi } from '../utils/cylinderCalculations';
import { InputField } from './InputField';
import { formatIndianCurrency } from '../utils/formatting';
import { ReportLayout } from './ReportLayout';
import DownloadPdfButton from './DownloadPdfButton';

const formatGasTypeLabel = (gasType: 'nitrogen' | 'oxygen'): string =>
  gasType.charAt(0).toUpperCase() + gasType.slice(1);

const lufgaRegularStyle = { fontFamily: "'Lufga', sans-serif", fontWeight: 400 } as const;
const lufgaSemiboldStyle = { fontFamily: "'Lufga', sans-serif", fontWeight: 600 } as const;
const lufgaRegularTickStyle = { fill: '#000000', fontFamily: 'Lufga, sans-serif', fontSize: 12 } as const;

export default function PSAVsCylinders() {
  const [inputs, setInputs] = useState<CylinderInputs>({
    gasType: 'nitrogen',
    cylindersPerDay: 10,
    plantRunningHours: 24,
    plantRunningDays: 30,
    cylinderVolume: 7,
    cylinderVolumeCustom: 0,
    purity: 95,
    loadFactor: 0.9,
    cylinderCost: 1000,
    powerCostPerUnit: 8,
    cylinderOperatorCostMonth: 15000,
    psaOperatorCostMonth: 10000,
    rentalCost: 5000,
    investmentCost: 5000000,
    annualMaintenanceCost: 75000,
    interestRate: 0,
    depreciationRate: 0,
    selectedFlow: undefined,
  });

  const [results, setResults] = useState<CylinderResult | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculatedResults = calculateCylinderRoi(inputs);
    setResults(calculatedResults);
  }, [inputs]);


  const updateInput = (key: keyof CylinderInputs, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const availablePurities = inputs.gasType === 'oxygen' ? OXYGEN_PURITIES : PURITIES;

  // All flows for the current purity/gasType — used in large-flow picker
  // Only include flows whose airRequirement can be matched by an available compressor
  const flowDataSource = inputs.gasType === 'oxygen' ? OXYGEN_FLOW_DATA : FLOW_DATA;
  const maxCompressorAirFlow = Math.max(...COMPRESSOR_DATA.map(c => c.airFlow));
  const availableFlows = flowDataSource
    .filter(d => d.purity === inputs.purity && d.airRequirement <= maxCompressorAirFlow)
    .map(d => d.flow)
    .sort((a, b) => a - b);
  // Threshold is the max single-unit flow for this gas+purity; matches cylinderCalculations.ts logic
  // Oxygen (purity 95): ~250 NM³/hr  |  Nitrogen (purity-dependent): up to ~2362 NM³/hr
  const LARGE_FLOW_THRESHOLD = availableFlows.length > 0 ? Math.max(...availableFlows) : 2362;

  if (!results) return <div>Loading...</div>;

  const effectiveUnitPricePSA  = results.unitPricePSA ?? 0;
  const effectivePower         = results.power;
  const effectivePSAAnnualCost = results.totalRunningCostPSA;
  const displayPsaPlantFlow    = results.isLargeFlow && inputs.selectedFlow ? inputs.selectedFlow : results.psaPlantFlow;
  // Always show PSA plant flow in the PSA System Costs panel.
  // In large-flow mode the total flow (flow × N units) is shown; otherwise single-unit flow.
  const displayPsaSystemCostFlow = results.isLargeFlow ? results.psaTotalFlow : results.psaPlantFlow;
  const displayCompressorKW    = results.matchedCompressorKW ?? 0;

  // --- Yearly data (must be after isPSAInvalid is defined) ---
  const yearlyData = (() => {
    let cumulativeCashFlow = -(inputs.investmentCost ?? 0);
    let wdv = inputs.investmentCost ?? 0;
    const data = [];
    for (let i = 1; i <= 10; i++) {
      const annualInterest     = wdv * ((inputs.interestRate ?? 0) / 100);
      const annualDepreciation = wdv * ((inputs.depreciationRate ?? 0) / 100);

      // PSA cost: power + operator + maintenance + interest - depreciation
      const psaCost = (results.annualPowerCost ?? 0) + results.psaOperatorCostYear + (inputs.annualMaintenanceCost ?? 0) + annualInterest - annualDepreciation;

      const netCashFlow = results.totalRunningCostCylinder - psaCost;
      cumulativeCashFlow += netCashFlow;
      wdv -= annualDepreciation;

      data.push({
        year: `Year ${i}`,
        'Current System Cost': results.totalRunningCostCylinder * i,
        'PSA System Cost': psaCost * i,
        'Cumulative Savings': cumulativeCashFlow
      });
    }
    return data;
  })();

  const roiData  = yearlyData.map(d => ({ year: d.year, cumulativeCashFlow: d['Cumulative Savings'] }));

  const chartData = [
    {
      name: 'Monthly Cost',
      'Cylinder System': results.totalRunningCostCylinder / 12,
      'PSA System': effectivePSAAnnualCost / 12
    },
    {
      name: 'Annual Cost',
      'Cylinder System': results.totalRunningCostCylinder,
      'PSA System': effectivePSAAnnualCost
    }
  ];

  // Helpers for print charts — auto-scales to Cr/L to keep axis labels short
  const formatAxisINRShort = (value: number): string => {
    const v = Number(value);
    if (Math.abs(v) >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
    if (Math.abs(v) >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)}L`;
    if (Math.abs(v) >= 1_000)       return `₹${(v / 1_000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
  };
  // Smart payback: shows hours/days when < 1 month
  const formatPayback = (months: number): string => {
    if (!months || months <= 0) return 'N/A';
    if (months < 1 / 30) { const h = months * 30 * 24; return `${h.toFixed(1)} hrs`; }
    if (months < 1)      { const d = months * 30;      return `${d.toFixed(1)} days`; }
    return `${months.toFixed(1)} months`;
  };
  // Smart compact currency for summary cards
  const formatCardCurrency = (value: number): string => {
    const abs = Math.abs(value);
    if (abs >= 1_00_00_00_000) return `₹${(value / 1_00_00_00_000).toFixed(2)} TCr`;
    if (abs >= 1_00_00_000)    return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
    if (abs >= 1_00_000)       return `₹${(value / 1_00_000).toFixed(2)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };
  // Domains for print charts
  const cylinderAxisMax = Math.max(...chartData.map(item => item['Cylinder System'] || 0));
  const psaAxisMax = Math.max(...chartData.map(item => item['PSA System'] || 0));
  const roiMin = Math.min(...roiData.map(d => d.cumulativeCashFlow));
  const roiMax = Math.max(...roiData.map(d => d.cumulativeCashFlow));
  const roiRange  = Math.max(roiMax - roiMin, 1);
  const roiBuffer = roiRange * 0.05;
  const breakEvenYearLabel = results?.paybackPeriodMonths
    ? `Year ${Math.ceil((results.paybackPeriodMonths ?? 0) / 12)}`
    : undefined;

  const inputParametersSummary = (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-gray-900 mb-4" style={lufgaSemiboldStyle}>Input Parameters</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Gas Type:</span><span style={lufgaRegularStyle}>{formatGasTypeLabel(inputs.gasType)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Cylinders per Day:</span><span style={lufgaRegularStyle}>{inputs.cylindersPerDay}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Cylinder Volume:</span><span className="font-medium">{inputs.cylinderVolume === 'other' ? inputs.cylinderVolumeCustom : inputs.cylinderVolume} m³</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Running Hours:</span><span className="font-medium">{inputs.plantRunningHours} hrs/day</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Running Days:</span><span className="font-medium">{inputs.plantRunningDays} days/month</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Cylinder Cost:</span><span className="font-medium">{inputs.cylinderCost} ₹/cylinder</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Purity:</span><span className="font-medium">{inputs.purity}%</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Power Cost:</span><span className="font-medium">{inputs.powerCostPerUnit} ₹/kWh</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Investment Cost:</span><span className="font-medium">{formatIndianCurrency(inputs.investmentCost ?? 0)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Annual Maintenance:</span><span className="font-medium">{formatIndianCurrency(inputs.annualMaintenanceCost ?? 0)}</span></div>
        {results.isLargeFlow && (
          <>
            <div className="flex justify-between"><span className="text-gray-600">Flow Required Per Hour:</span><span className="font-medium">{results.perHourConsumption.toFixed(2)} m³/hr</span></div>
            <div className="flex justify-between"><span className="text-gray-600">PSA Plant Flow:</span><span className="font-medium">{displayPsaSystemCostFlow} m³/hr</span></div>
          </>
        )}
      </div>
    </div>
  );

  const costComparisonContent = (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-gradient-to-br from-red-50 to-orange-100 p-6 rounded-lg border">
        <div className="flex items-center space-x-2 mb-4"><IndianRupee className="h-5 w-5 text-red-600" /><h3 className="font-semibold text-gray-900">Cylinder System Costs</h3></div>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Gas Cost per m³:</span><span className="font-medium">₹{(results.unitPricePerM3 ?? 0).toFixed(2)}/-</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Monthly Expense:</span><span className="font-medium">{formatIndianCurrency(results.monthlyExpenseCylinder)}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Operator Cost (Annual):</span><span className="font-medium">{formatIndianCurrency(results.cylinderOperatorCostYear)}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Rental Cost (Annual):</span><span className="font-medium">{formatIndianCurrency(results.annualRentalCost)}</span></div>
          <div className="border-t pt-3"><div className="flex justify-between items-center"><span className="font-medium text-gray-900">Total Annual Cost:</span><span className="font-bold text-lg text-red-600">{formatIndianCurrency(results.totalRunningCostCylinder)}</span></div></div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg border">
        <div className="flex items-center space-x-2 mb-4"><Zap className="h-5 w-5 text-blue-600" /><h3 className="font-semibold text-gray-900">PSA System Costs</h3></div>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Flow Required Per Hour:</span><span className="font-medium">{results.perHourConsumption.toFixed(2)} m³/hr</span></div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">PSA Plant Flow:</span>
            <span className="font-semibold text-indigo-700">{displayPsaSystemCostFlow} m³/hr</span>
          </div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Gas Cost per m³:</span><span className="font-medium">₹{effectiveUnitPricePSA.toFixed(2)}/-</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Power Consumption:</span><span className="font-medium">{effectivePower.toFixed(2)} kW</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Operator Cost (Annual):</span><span className="font-medium">{formatIndianCurrency(results.psaOperatorCostYear)}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Utilization Factor:</span><span className="font-medium">{results.utilizationFactor.toFixed(2)}</span></div>
          {(results.annualInterest ?? 0) > 0 && (<div className="flex justify-between items-center"><span className="text-sm text-gray-600">Annual Interest:</span><span className="font-medium">{formatIndianCurrency(results.annualInterest ?? 0)}</span></div>)}
          {(results.annualDepreciation ?? 0) > 0 && (<div className="flex justify-between items-center"><span className="text-sm text-gray-600">Annual Depreciation (Tax Shield):</span><span className="font-medium text-green-600">-{formatIndianCurrency(results.annualDepreciation ?? 0)}</span></div>)}
          <div className="border-t pt-3"><div className="flex justify-between items-center"><span className="font-medium text-gray-900">Total Annual Cost:</span><span className="font-bold text-lg text-blue-600">{formatIndianCurrency(effectivePSAAnnualCost)}</span></div></div>
        </div>
      </div>
    </div>
  );

  const resultsContent = (
    <div className="lg:col-span-2 space-y-6">
      {costComparisonContent}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-gray-900 mb-4 text-center" style={lufgaSemiboldStyle}>Monthly & Annual Cost Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} barSize={60} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                interval={0}
                height={44}
                tickLine={false}
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  const words = payload.value.split(' ');
                  return (
                    <text textAnchor="middle" fill="#000000" fontFamily="Lufga, sans-serif" fontSize={12}>
                      {words.map((word: string, i: number) => (
                        <tspan key={i} x={x} dy={i === 0 ? y + 16 : 16}>{word}</tspan>
                      ))}
                    </text>
                  );
                }}
              />
              <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => formatAxisINRShort(Number(value))} domain={[0, cylinderAxisMax * 1.2]} tick={{ fill: '#000000', fontFamily: 'Lufga, sans-serif', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatAxisINRShort(Number(value))} domain={[0, psaAxisMax * 1.2]} tick={{ fill: '#000000', fontFamily: 'Lufga, sans-serif', fontSize: 12 }} />
              <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
              <Legend wrapperStyle={{ fontFamily: 'Lufga, sans-serif', fontWeight: 400 }} />
              <Bar yAxisId="left" dataKey="Cylinder System" fill="#3b82f6" name="Cylinder System" />
              <Bar yAxisId="right" dataKey="PSA System" fill="#10b981" name="PSA System" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">Return on Investment (ROI)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={roiData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => formatAxisINRShort(Number(value))} />
              <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
              <Legend />
              <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="cumulativeCashFlow" stroke="#8884d8" strokeWidth={3} name="Cumulative Cash Flow" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b"><h3 className="font-semibold text-gray-900">10-Year Cumulative Savings</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current System Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PSA System Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cumulative Savings</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {yearlyData.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatIndianCurrency(row['Current System Cost'])}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatIndianCurrency(row['PSA System Cost'])}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatIndianCurrency(row['Cumulative Savings'])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="psa-cylinders-root min-h-screen flex flex-col bg-gray-50" style={lufgaRegularStyle}>
      <style>{`
        .psa-cylinders-root, .psa-cylinders-root * {
          font-family: 'Lufga', sans-serif;
        }
        .psa-cylinders-root h1,
        .psa-cylinders-root h2,
        .psa-cylinders-root h3,
        .psa-cylinders-root h4,
        .psa-cylinders-root h5,
        .psa-cylinders-root h6 {
          font-weight: 600;
        }
        .psa-cylinders-root p,
        .psa-cylinders-root span,
        .psa-cylinders-root label,
        .psa-cylinders-root input,
        .psa-cylinders-root select,
        .psa-cylinders-root td,
        .psa-cylinders-root th,
        .psa-cylinders-root button {
          font-weight: 400;
        }
      `}</style>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex items-center justify-end gap-3 print:hidden">
        <DownloadPdfButton contentToPrint={reportRef} tabName={'PSA_Vs_Cylinders'} />
      </div>

      {/* Screen View */}
      <div className="print:hidden p-6">
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center space-x-2 mb-4"><Database className="h-5 w-5 text-blue-600" /><h3 className="text-gray-900" style={lufgaSemiboldStyle}>Input Parameters</h3></div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={lufgaRegularStyle}>Gas Type</label>
                  <select
                    value={inputs.gasType}
                    onChange={(e) => {
                      const nextGasType = e.target.value as CylinderInputs['gasType'];
                      setInputs(prev => {
                        const allowedPurities = nextGasType === 'oxygen' ? OXYGEN_PURITIES : PURITIES;
                        const nextPurity = allowedPurities.includes(prev.purity as any) ? prev.purity : allowedPurities[0];
                        return { ...prev, gasType: nextGasType, purity: nextPurity, selectedFlow: undefined };
                      });
                    }}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    style={lufgaRegularStyle}
                    aria-label="Gas Type"
                  >
                    {GAS_TYPES.map(type => (<option key={type.value} value={type.value}>{type.label}</option>))}
                  </select>
                </div>
                <InputField label="Cylinders per Day" value={inputs.cylindersPerDay} onChange={(value) => updateInput('cylindersPerDay', value)} labelStyle={lufgaRegularStyle} inputStyle={lufgaRegularStyle} unitStyle={lufgaRegularStyle} />
                <InputField label="Plant Running Hours" value={inputs.plantRunningHours} onChange={(value) => updateInput('plantRunningHours', value)} unit="hrs/day" labelStyle={lufgaRegularStyle} inputStyle={lufgaRegularStyle} unitStyle={lufgaRegularStyle} />
                <InputField label="Plant Running Days" value={inputs.plantRunningDays} onChange={(value) => updateInput('plantRunningDays', value)} unit="days/month" labelStyle={lufgaRegularStyle} inputStyle={lufgaRegularStyle} unitStyle={lufgaRegularStyle} />
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={lufgaRegularStyle}>Cylinder Volume</label>
                  <select value={inputs.cylinderVolume} onChange={(e) => updateInput('cylinderVolume', e.target.value === 'other' ? 'other' : Number(e.target.value))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" aria-label="Cylinder Volume" style={lufgaRegularStyle}>
                    {CYLINDER_VOLUMES.map(volume => (<option key={volume} value={volume}>{volume === 'other' ? 'Other' : `${volume} m³`}</option>))}
                  </select>
                </div>
                {inputs.cylinderVolume === 'other' && (<InputField label="Custom Cylinder Volume" value={inputs.cylinderVolumeCustom} onChange={(value) => updateInput('cylinderVolumeCustom', value)} unit="m³" />)}
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={lufgaRegularStyle}>Purity</label>
                  <select value={inputs.purity} onChange={(e) => updateInput('purity', Number(e.target.value))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" aria-label="Purity" style={lufgaRegularStyle}>
                    {availablePurities.map(purity => (<option key={purity} value={purity}>{purity}%</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={lufgaRegularStyle}>Load Factor</label>
                  <select value={inputs.loadFactor} onChange={(e) => updateInput('loadFactor', Number(e.target.value))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" aria-label="Load Factor" style={lufgaRegularStyle}>
                    {LOAD_FACTORS.map(factor => (<option key={factor} value={factor}>{factor.toFixed(2)}</option>))}
                  </select>
                </div>
                <InputField label="Cylinder Cost" value={inputs.cylinderCost} onChange={(value) => updateInput('cylinderCost', value)} unit="₹/cylinder" />
                <InputField label="Power Cost per Unit" value={inputs.powerCostPerUnit} onChange={(value) => updateInput('powerCostPerUnit', value)} unit="₹/kWh" />
                <InputField label="Investment Cost (₹)" value={inputs.investmentCost || 0} onChange={(value) => updateInput('investmentCost', value)} />
                <InputField label="Annual Maintenance (₹)" value={inputs.annualMaintenanceCost || 0} onChange={(value) => updateInput('annualMaintenanceCost', value)} />
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={lufgaRegularStyle}>Interest Rate (%)</label>
                  <select value={inputs.interestRate || 0} onChange={(e) => updateInput('interestRate', Number(e.target.value))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" aria-label="Interest Rate" style={lufgaRegularStyle}>
                    {INTEREST_RATES.map(r => (<option key={r} value={r}>{r}%</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={lufgaRegularStyle}>Depreciation Rate (%)</label>
                  <select value={inputs.depreciationRate || 0} onChange={(e) => updateInput('depreciationRate', Number(e.target.value))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" aria-label="Depreciation Rate" style={lufgaRegularStyle}>
                    {DEPRECIATION_RATES.map(r => (<option key={r} value={r}>{r}%</option>))}
                  </select>
                </div>

                {/* ── Large-Flow Mode: Flow Picker ── */}
                {results.isLargeFlow && (
                  <>
                    {/* Flow Required Per Hour — frozen */}
                    <div>
                      <label className="block text-sm text-gray-700 mb-1" style={lufgaRegularStyle}>Flow Required Per Hour</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={results.perHourConsumption.toFixed(2)}
                          readOnly
                          className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm cursor-not-allowed text-gray-600"
                          style={lufgaRegularStyle}
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">m³/hr</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Auto calculated from consumption</p>
                    </div>

                    {/* Choose Flow heading + dropdown */}
                    <div>
                      <p className="text-sm font-semibold text-indigo-700 mb-2" style={lufgaSemiboldStyle}>Choose Flow</p>
                      <label className="block text-sm text-gray-700 mb-1" style={lufgaRegularStyle}>Select Unit PSA Flow</label>
                      <select
                        value={inputs.selectedFlow ?? ''}
                        onChange={(e) => updateInput('selectedFlow', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        aria-label="Choose Flow"
                        style={lufgaRegularStyle}
                      >
                        <option value="">-- Select a flow --</option>
                        {availableFlows.map(f => (
                          <option key={f} value={f}>{f} m³/hr</option>
                        ))}
                      </select>
                    </div>

                  </>
                )}
                <div>
  <label className="block text-sm text-gray-700 mb-1" style={lufgaRegularStyle}>PSA Plant Flow Per Unit:</label>
  <div className="flex items-center gap-2">
    <input
      type="number"
      value={displayPsaPlantFlow ?? 0}
      readOnly
      className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm cursor-not-allowed text-gray-600"
      style={lufgaRegularStyle}
    />
    <span className="text-sm text-gray-500 whitespace-nowrap">m³/hr</span>
  </div>
  <p className="text-xs text-gray-400 mt-1">Auto matched from consumption</p>
</div>
<div>
  <label className="block text-sm text-gray-700 mb-1" style={lufgaRegularStyle}>Compressor Unit kW</label>
  <div className="flex items-center gap-2">
    <input
      type="number"
      value={displayCompressorKW}
      readOnly
      className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm cursor-not-allowed text-gray-600"
      style={lufgaRegularStyle}
    />
    <span className="text-sm text-gray-500 whitespace-nowrap">kW</span>
  </div>
  <p className="text-xs text-gray-400 mt-1">Auto matched from consumption</p>
</div>
                <InputField label="Cylinder Operator Cost (Monthly)" value={inputs.cylinderOperatorCostMonth} onChange={(value) => updateInput('cylinderOperatorCostMonth', value)} unit="₹/month" />
                <InputField label="PSA Operator Cost (Monthly)" value={inputs.psaOperatorCostMonth} onChange={(value) => updateInput('psaOperatorCostMonth', value)} unit="₹/month" />
                <InputField label="Rental Cost (Monthly)" value={inputs.rentalCost} onChange={(value) => updateInput('rentalCost', value)} unit="₹/month" />
              </div>
            </div>
            {resultsContent}
        </div>
      </div>

      {/* Print View */}
      <ReportLayout
        ref={reportRef}
        title="PSA vs. Cylinder Supply: A Cost-Benefit Analysis"
        summary={<p className="text-justify">This report presents a comprehensive financial analysis comparing the current expenditure on cylinder supply with the projected costs and savings of implementing an on-site PSA (Pressure Swing Adsorption) generation plant. The evaluation indicates substantial long-term financial benefits, a rapid return on investment, and enhanced operational autonomy.</p>}
        pageOneContent={<>{inputParametersSummary}{costComparisonContent}</>}
      >
        <>
          <div className="print-page space-y-8">
            <div className="avoid-break">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 p-6 rounded-r-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center"><div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3"><span className="text-white font-bold text-sm">2</span></div>Financial Summary & Investment Analysis</h2>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div className="bg-white p-4 rounded-lg border border-green-200 shadow-sm flex flex-col items-center justify-center min-h-[100px]">
                    <div className="font-bold text-green-600 mb-1 break-all leading-tight"
                      style={{ fontSize: results.monthlySavingsPSA > 1e9 ? '1.25rem' : results.monthlySavingsPSA > 1e7 ? '1.5rem' : '2rem' }}>
                      {formatCardCurrency(results.monthlySavingsPSA)}
                    </div>
                    <div className="text-sm font-medium text-green-800">Estimated Monthly Savings</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm flex flex-col items-center justify-center min-h-[100px]">
                    <div className="font-bold text-blue-600 mb-1 break-all leading-tight"
                      style={{ fontSize: results.annualSavings > 1e9 ? '1.25rem' : results.annualSavings > 1e7 ? '1.5rem' : '2rem' }}>
                      {formatCardCurrency(results.annualSavings)}
                    </div>
                    <div className="text-sm font-medium text-blue-800">Estimated Annual Savings</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm flex flex-col items-center justify-center min-h-[100px]">
                    <div className="font-bold text-purple-600 mb-1 leading-tight"
                      style={{ fontSize: (results.roiPercentage ?? 0) > 9999 ? '1.1rem' : (results.roiPercentage ?? 0) > 999 ? '1.5rem' : '2rem' }}>
                      {results.roiPercentage && results.roiPercentage > 99999 ? `>${(99999).toLocaleString()}%` : `${results.roiPercentage?.toFixed(1)}%`}
                    </div>
                    <div className="text-sm font-medium text-purple-800">Return on Investment (ROI)</div>
                    <div className="text-xs text-gray-500 mt-1">Payback in {formatPayback(results.paybackPeriodMonths ?? 0)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="avoid-break">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Visual Cost Comparison</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow border">
                  <h3 className="text-gray-900 mb-4 text-center" style={lufgaSemiboldStyle}>Monthly & Annual Cost Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} height={52} tickMargin={8} tickLine={false} tick={lufgaRegularTickStyle} />
                  <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => formatAxisINRShort(Number(value))} domain={[0, cylinderAxisMax * 1.2]} tick={{ fill: '#000000', fontFamily: 'Lufga, sans-serif', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatAxisINRShort(Number(value))} domain={[0, psaAxisMax * 1.2]} tick={{ fill: '#000000', fontFamily: 'Lufga, sans-serif', fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
                  <Legend wrapperStyle={{ fontFamily: 'Lufga, sans-serif', fontWeight: 400 }} />
                  <Bar yAxisId="left" dataKey="Cylinder System" fill="#3b82f6" name="Cylinder System" isAnimationActive={false} />
                  <Bar yAxisId="right" dataKey="PSA System" fill="#10b981" name="PSA System" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border">
                  <h3 className="font-semibold text-gray-900 mb-4 text-center">Return on Investment (ROI)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={roiData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => formatAxisINRShort(Number(value))} domain={[roiMin - roiBuffer, roiMax + roiBuffer]} />
                  <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
                  {breakEvenYearLabel && (
                    <ReferenceLine x={breakEvenYearLabel} stroke="#ef4444" label={{ value: 'Break-even', position: 'top', fill: '#ef4444' }} strokeDasharray="5 5" />
                  )}
                  <Line
                    type="monotone"
                    dataKey="cumulativeCashFlow"
                    stroke="#2563eb"
                    strokeOpacity={1}
                    strokeWidth={4}
                    name="Cumulative Cash Flow"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
          <div className="print-page space-y-8">
            <div className="avoid-break">
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50 border-l-4 border-indigo-600 p-6 rounded-r-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center"><div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center mr-3"><span className="text-white font-bold text-sm">3</span></div>Business Case & Recommendation</h2>
                <div className="space-y-4 text-gray-700 leading-relaxed text-justify">
                  <p>Transitioning from cylinder supply to an on-site PSA plant presents a compelling financial and operational advantage. With projected monthly savings of <span className="font-semibold text-green-700">{formatIndianCurrency(results.monthlySavingsPSA)}</span> and annual savings of <span className="font-semibold text-green-700">{formatIndianCurrency(results.annualSavings)}</span>, the initial investment is quickly recovered, leading to significant long-term cost reduction.</p>
                  <p>The calculated return on investment of <span className="font-semibold text-blue-700">{results.roiPercentage ? `${results.roiPercentage.toFixed(1)}%` : 'N/A'}</span>, with a payback period of just <span className="font-semibold text-blue-700">{results.paybackPeriodMonths ? formatPayback(results.paybackPeriodMonths) : 'N/A'}</span>, underscores the financial viability of this project. Beyond the numbers, on-site generation eliminates dependence on external suppliers, mitigates logistical risks, and reduces the carbon footprint associated with cylinder deliveries.</p>
                  <p className="font-semibold">Recommendation: We strongly recommend proceeding with the implementation of the PSA generation system to realize immediate cost savings, improve operational efficiency, and achieve supply chain independence.</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b"><h3 className="font-semibold text-gray-900">10-Year Cumulative Savings</h3></div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current System Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PSA System Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cumulative Savings</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {yearlyData.map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatIndianCurrency(row['Current System Cost'])}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatIndianCurrency(row['PSA System Cost'])}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatIndianCurrency(row['Cumulative Savings'])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      </ReportLayout>
    </div>
  );
}