import { useState, useEffect, useRef } from 'react';
import { Database, Zap, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ResponsiveContainer, Legend, ReferenceLine, LabelList } from 'recharts';
import { CylinderInputs, CylinderResult, GAS_TYPES, CYLINDER_VOLUMES, LOAD_FACTORS, PURITIES, OXYGEN_PURITIES, INTEREST_RATES, DEPRECIATION_RATES } from '../types/calculator';
import { calculateCylinderRoi } from '../utils/cylinderCalculations';
import { findMatchingFlow, findMatchingCompressor } from '../utils/flowMatching';
import { InputField } from './InputField';
import { formatIndianCurrency } from '../utils/formatting';
import { ReportLayout } from './ReportLayout';
import DownloadPdfButton from './DownloadPdfButton';

// Lufga font faces — place the .otf files in /public/fonts/
const lufgaFontStyle = `
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
`;


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
    psaPlantFlow: 10,
    compressorKW: 5.5,
    cylinderOperatorCostMonth: 15000,
    psaOperatorCostMonth: 10000,
    rentalCost: 5000,
    investmentCost: 5000000,
    annualMaintenanceCost: 75000,
    interestRate: 0,
    depreciationRate: 0
  });

  const [results, setResults] = useState<CylinderResult | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cylinderVolume = inputs.cylinderVolume === 'other' ? (inputs.cylinderVolumeCustom || 0) : Number(inputs.cylinderVolume);
    const perHourConsumption = cylinderVolume > 0 && inputs.plantRunningHours > 0 ? (inputs.cylindersPerDay * cylinderVolume) / inputs.plantRunningHours : 0;
    const utilizationFactor = inputs.psaPlantFlow > 0 ? perHourConsumption / inputs.psaPlantFlow : 0;
    const tempInputs: CylinderInputs = { ...inputs, loadFactor: utilizationFactor };
    const calculatedResults = calculateCylinderRoi(tempInputs);
    const annualPowerCost = (calculatedResults.power * inputs.powerCostPerUnit * inputs.plantRunningHours * inputs.plantRunningDays * 12) * inputs.loadFactor;
    const adjustedTotalRunningCostPSA = annualPowerCost + calculatedResults.psaOperatorCostYear + (inputs.annualMaintenanceCost ?? 0) + (calculatedResults.annualInterest ?? 0) - (calculatedResults.annualDepreciation ?? 0);
    setResults({ ...calculatedResults, totalRunningCostPSA: adjustedTotalRunningCostPSA, annualPowerCost: annualPowerCost });
  }, [inputs]);

  useEffect(() => {
    const cylinderVolume = inputs.cylinderVolume === 'other' ? (inputs.cylinderVolumeCustom || 0) : Number(inputs.cylinderVolume);
    if (!cylinderVolume || inputs.plantRunningHours <= 0) return;
    const perHourConsumption = (inputs.cylindersPerDay * cylinderVolume) / inputs.plantRunningHours;
    const matchedFlow = findMatchingFlow(perHourConsumption, inputs.purity, inputs.gasType);
    if (matchedFlow) {
      const matchedCompressor = findMatchingCompressor(matchedFlow.airRequirement);
      const nextFlow = matchedFlow.flow;
      const nextCompressorKw = matchedCompressor?.kw ?? inputs.compressorKW;
      if (inputs.psaPlantFlow !== nextFlow || inputs.compressorKW !== nextCompressorKw) {
        setInputs(prev => ({ ...prev, psaPlantFlow: nextFlow, compressorKW: nextCompressorKw }));
      }
    }
  }, [inputs.cylindersPerDay, inputs.cylinderVolume, inputs.cylinderVolumeCustom, inputs.purity, inputs.gasType, inputs.plantRunningHours, inputs.psaPlantFlow, inputs.compressorKW]);

  const updateInput = (key: keyof CylinderInputs, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const availablePurities = inputs.gasType === 'oxygen' ? OXYGEN_PURITIES : PURITIES;

  const yearlyData = (() => {
    if (!results) return [];
    let cumulativeCashFlow = -(inputs.investmentCost ?? 0);
    let wdv = inputs.investmentCost ?? 0;
    const data = [];
    for (let i = 1; i <= 10; i++) {
      const annualInterest = wdv * ((inputs.interestRate ?? 0) / 100);
      const annualDepreciation = wdv * ((inputs.depreciationRate ?? 0) / 100);
      const psaCost = (results.annualPowerCost ?? 0) + results.psaOperatorCostYear + (inputs.annualMaintenanceCost ?? 0) + annualInterest - annualDepreciation;
      const netCashFlow = results.totalRunningCostCylinder - psaCost;
      cumulativeCashFlow += netCashFlow;
      wdv -= annualDepreciation;
      data.push({ year: `Year ${i}`, 'Current System Cost': results.totalRunningCostCylinder * i, 'PSA System Cost': psaCost * i, 'Cumulative Savings': cumulativeCashFlow });
    }
    return data;
  })();

  const roiData = yearlyData.map(d => ({ year: d.year, cumulativeCashFlow: d['Cumulative Savings'] }));

  const chartData = results ? [
    { name: 'Cylinder System', 'Monthly Cost': results.totalRunningCostCylinder / 12, 'Annual Cost': results.totalRunningCostCylinder },
    { name: 'PSA System', 'Monthly Cost': results.totalRunningCostPSA / 12, 'Annual Cost': results.totalRunningCostPSA }
  ] : [];

  // Helpers for print charts
  const formatAxisINRShort = (value: number) => `₹${(Number(value) / 100000).toFixed(1)}L`;
  const CurrencyBarLabel = (props: any) => {
    const { x, y, value } = props;
    if (value == null) return null;
    return (
      <text x={x} y={y} dy={-6} fill="#111827" fontSize={12} textAnchor="middle">
        {formatIndianCurrency(Number(value))}
      </text>
    );
  };

  // Domains for print charts
  const monthlyMax = Math.max(
    chartData[0]?.['Monthly Cost'] || 0,
    chartData[1]?.['Monthly Cost'] || 0
  );
  const annualMax = Math.max(
    chartData[0]?.['Annual Cost'] || 0,
    chartData[1]?.['Annual Cost'] || 0
  );
  const roiMin = Math.min(...roiData.map(d => d.cumulativeCashFlow));
  const roiMax = Math.max(...roiData.map(d => d.cumulativeCashFlow));
  const roiRange = Math.max(roiMax - roiMin, 1);
  const roiBuffer = roiRange * 0.05;
  const breakEvenYearLabel = results?.paybackPeriodMonths ? `Year ${Math.ceil((results.paybackPeriodMonths ?? 0) / 12)}` : undefined;

  if (!results) return <div>Loading...</div>;

  const inputParametersSummary = (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-gray-900 mb-4" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Input Parameters</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Gas Type:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.gasType}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Cylinders per Day:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.cylindersPerDay}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Cylinder Volume:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.cylinderVolume === 'other' ? inputs.cylinderVolumeCustom : inputs.cylinderVolume} m³</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Running Hours:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.plantRunningHours} hrs/day</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Running Days:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.plantRunningDays} days/month</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Cylinder Cost:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.cylinderCost} ₹/m³</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Purity:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.purity}%</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Power Cost:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.powerCostPerUnit} ₹/kWh</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Investment Cost:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(inputs.investmentCost ?? 0)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Annual Maintenance:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(inputs.annualMaintenanceCost ?? 0)}</span></div>
      </div>
    </div>
  );

  const costComparisonContent = (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-gradient-to-br from-red-50 to-orange-100 p-6 rounded-lg border">
        <div className="flex items-center space-x-2 mb-4"><DollarSign className="h-5 w-5 text-red-600" /><h3 className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Cylinder System Costs</h3></div>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Gas Cost per m³:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>₹{(results.unitPricePerM3 ?? 0).toFixed(2)}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Monthly Expense:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(results.monthlyExpenseCylinder)}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Operator Cost (Annual):</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(results.cylinderOperatorCostYear)}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Rental Cost (Annual):</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(results.annualRentalCost)}</span></div>
          <div className="border-t pt-3"><div className="flex justify-between items-center"><span className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Total Annual Cost:</span><span className="font-bold text-lg text-red-600">{formatIndianCurrency(results.totalRunningCostCylinder)}</span></div></div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg border">
        <div className="flex items-center space-x-2 mb-4"><Zap className="h-5 w-5 text-blue-600" /><h3 className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>PSA System Costs</h3></div>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Gas Cost per m³:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>₹{(results.unitPricePSA ?? 0).toFixed(2)}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Power Consumption:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{results.power.toFixed(2)} kW</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Operator Cost (Annual):</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(results.psaOperatorCostYear)}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Utilization Factor:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{results.utilizationFactor.toFixed(2)}</span></div>
          {(results.annualInterest ?? 0) > 0 && (<div className="flex justify-between items-center"><span className="text-sm text-gray-600">Annual Interest:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(results.annualInterest ?? 0)}</span></div>)}
          {(results.annualDepreciation ?? 0) > 0 && (<div className="flex justify-between items-center"><span className="text-sm text-gray-600">Annual Depreciation (Tax Shield):</span><span className="text-green-600" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>-{formatIndianCurrency(results.annualDepreciation ?? 0)}</span></div>)}
          <div className="border-t pt-3"><div className="flex justify-between items-center"><span className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Total Annual Cost:</span><span className="font-bold text-lg text-blue-600">{formatIndianCurrency(results.totalRunningCostPSA)}</span></div></div>
        </div>
      </div>
    </div>
  );

  const resultsContent = (
    <div className="lg:col-span-2 space-y-6">
      {costComparisonContent}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-gray-900 mb-4 text-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Monthly & Annual Cost Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `₹${(value/100000).toFixed(1)}L`} />
              <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="Monthly Cost" fill="#3b82f6" name="Monthly Cost" />
              <Bar dataKey="Annual Cost" fill="#10b981" name="Annual Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-gray-900 mb-4 text-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Return on Investment (ROI)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={roiData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => `₹${(value/100000).toFixed(1)}L`} />
              <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
              <Legend />
              <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="cumulativeCashFlow" stroke="#8884d8" strokeWidth={3} name="Cumulative Cash Flow" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b"><h3 className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>10-Year Cumulative Savings</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Year</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Current System Cost</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>PSA System Cost</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Cumulative Savings</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {yearlyData.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{row.year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatIndianCurrency(row['Current System Cost'])}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatIndianCurrency(row['PSA System Cost'])}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(row['Cumulative Savings'])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
      <style>{lufgaFontStyle}</style>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex items-center justify-end gap-3 print:hidden">
        <DownloadPdfButton contentToPrint={reportRef} tabName={'PSA_Vs_Cylinders'} inputs={inputs} />
      </div>

      {/* Screen View */}
      <div className="print:hidden p-6">
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center space-x-2 mb-4"><Database className="h-5 w-5 text-blue-600" /><h3 className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Input Parameters</h3></div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Gas Type</label>
                  <select value={inputs.gasType} onChange={(e) => updateInput('gasType', e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" aria-label="Gas Type">
                    {GAS_TYPES.map(type => (<option key={type.value} value={type.value}>{type.label}</option>))}
                  </select>
                </div>
                <InputField label="Cylinders per Day" value={inputs.cylindersPerDay} onChange={(value) => updateInput('cylindersPerDay', value)} />
                <InputField label="Plant Running Hours" value={inputs.plantRunningHours} onChange={(value) => updateInput('plantRunningHours', value)} unit="hrs/day" />
                <InputField label="Plant Running Days" value={inputs.plantRunningDays} onChange={(value) => updateInput('plantRunningDays', value)} unit="days/month" />
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Cylinder Volume</label>
                  <select value={inputs.cylinderVolume} onChange={(e) => updateInput('cylinderVolume', e.target.value === 'other' ? 'other' : Number(e.target.value))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" aria-label="Cylinder Volume">
                    {CYLINDER_VOLUMES.map(volume => (<option key={volume} value={volume}>{volume === 'other' ? 'Other' : `${volume} m³`}</option>))}
                  </select>
                </div>
                {inputs.cylinderVolume === 'other' && (<InputField label="Custom Cylinder Volume" value={inputs.cylinderVolumeCustom} onChange={(value) => updateInput('cylinderVolumeCustom', value)} unit="m³" />)}
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Purity</label>
                  <select value={inputs.purity} onChange={(e) => updateInput('purity', Number(e.target.value))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" aria-label="Purity">
                    {availablePurities.map(purity => (<option key={purity} value={purity}>{purity}%</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Load Factor</label>
                  <select value={inputs.loadFactor} onChange={(e) => updateInput('loadFactor', Number(e.target.value))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" aria-label="Load Factor">
                    {LOAD_FACTORS.map(factor => (<option key={factor} value={factor}>{factor}</option>))}
                  </select>
                </div>
                <InputField label="Cylinder Cost" value={inputs.cylinderCost} onChange={(value) => updateInput('cylinderCost', value)} unit="₹/m³" />
                <InputField label="Power Cost per Unit" value={inputs.powerCostPerUnit} onChange={(value) => updateInput('powerCostPerUnit', value)} unit="₹/kWh" />
                <InputField label="Investment Cost (₹)" value={inputs.investmentCost || 0} onChange={(value) => updateInput('investmentCost', value)} />
                <InputField label="Annual Maintenance (₹)" value={inputs.annualMaintenanceCost || 0} onChange={(value) => updateInput('annualMaintenanceCost', value)} />
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Interest Rate (%)</label>
                  <select value={inputs.interestRate || 0} onChange={(e) => updateInput('interestRate', Number(e.target.value))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" aria-label="Interest Rate">
                    {INTEREST_RATES.map(r => (<option key={r} value={r}>{r}%</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Depreciation Rate (%)</label>
                  <select value={inputs.depreciationRate || 0} onChange={(e) => updateInput('depreciationRate', Number(e.target.value))} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" aria-label="Depreciation Rate">
                    {DEPRECIATION_RATES.map(r => (<option key={r} value={r}>{r}%</option>))}
                  </select>
                </div>
                <InputField label="PSA Plant Flow" value={inputs.psaPlantFlow} onChange={(value) => updateInput('psaPlantFlow', value)} unit="m³/hr" />
                <InputField label="Compressor KW" value={inputs.compressorKW} onChange={(value) => updateInput('compressorKW', value)} unit="kW" />
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
                <h2 className="text-2xl text-gray-800 mb-4 flex items-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}><div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3"><span className="text-white text-sm" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>2</span></div>Financial Summary & Investment Analysis</h2>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div className="bg-white p-6 rounded-lg border border-green-200 shadow-sm"><div className="text-4xl font-bold text-green-600 mb-2">{formatIndianCurrency(results.monthlySavingsPSA)}</div><div className="text-sm font-medium text-green-800">Estimated Monthly Savings</div></div>
                  <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm"><div className="text-4xl font-bold text-blue-600 mb-2">{formatIndianCurrency(results.annualSavings)}</div><div className="text-sm font-medium text-blue-800">Estimated Annual Savings</div></div>
                  <div className="bg-white p-6 rounded-lg border border-purple-200 shadow-sm"><div className="text-4xl font-bold text-purple-600 mb-2">{results.roiPercentage?.toFixed(1)}%</div><div className="text-sm font-medium text-purple-800">Return on Investment (ROI)</div><div className="text-xs text-gray-500 mt-1">Payback in {results.paybackPeriodMonths?.toFixed(1)} months</div></div>
                </div>
              </div>
            </div>
            <div className="avoid-break">
              <h2 className="text-2xl text-gray-800 mb-4 text-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Visual Cost Comparison</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow border">
                  <h3 className="text-gray-900 mb-4 text-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Monthly & Annual Cost Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => formatAxisINRShort(Number(value))} domain={[0, monthlyMax * 1.2]} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatAxisINRShort(Number(value))} domain={[0, annualMax * 1.2]} />
                  <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="Monthly Cost" fill="#3b82f6" name="Monthly Cost" isAnimationActive={false}>
                    <LabelList position="top" content={CurrencyBarLabel} />
                  </Bar>
                  <Bar yAxisId="right" dataKey="Annual Cost" fill="#10b981" name="Annual Cost" isAnimationActive={false}>
                    <LabelList position="top" content={CurrencyBarLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border">
                  <h3 className="text-gray-900 mb-4 text-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Return on Investment (ROI)</h3>
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
                <h2 className="text-2xl text-gray-800 mb-4 flex items-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}><div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center mr-3"><span className="text-white text-sm" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>3</span></div>Business Case & Recommendation</h2>
                <div className="space-y-4 text-gray-700 leading-relaxed text-justify">
                  <p>Transitioning from cylinder supply to an on-site PSA plant presents a compelling financial and operational advantage. With projected monthly savings of <span className="font-semibold text-green-700">{formatIndianCurrency(results.monthlySavingsPSA)}</span> and annual savings of <span className="font-semibold text-green-700">{formatIndianCurrency(results.annualSavings)}</span>, the initial investment is quickly recovered, leading to significant long-term cost reduction.</p>
                  <p>The calculated return on investment of <span className="font-semibold text-blue-700">{results.roiPercentage ? `${results.roiPercentage.toFixed(1)}%` : 'N/A'}</span>, with a payback period of just <span className="font-semibold text-blue-700">{results.paybackPeriodMonths ? `${results.paybackPeriodMonths.toFixed(1)} months` : 'N/A'}</span>, underscores the financial viability of this project. Beyond the numbers, on-site generation eliminates dependence on external suppliers, mitigates logistical risks, and reduces the carbon footprint associated with cylinder deliveries.</p>
                  <p className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Recommendation: We strongly recommend proceeding with the implementation of the PSA generation system to realize immediate cost savings, improve operational efficiency, and achieve supply chain independence.</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b"><h3 className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>10-Year Cumulative Savings</h3></div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Year</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Current System Cost</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>PSA System Cost</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Cumulative Savings</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {yearlyData.map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{row.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatIndianCurrency(row['Current System Cost'])}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatIndianCurrency(row['PSA System Cost'])}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(row['Cumulative Savings'])}</td>
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