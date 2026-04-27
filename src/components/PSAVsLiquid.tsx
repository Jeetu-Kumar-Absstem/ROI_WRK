import { useState, useRef } from 'react';
import { Calculator, DollarSign, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ResponsiveContainer, Legend, ReferenceLine, LabelList } from 'recharts';
import { RoiInputs, GAS_TYPES, LIQUID_UNITS, PURITIES, OXYGEN_PURITIES, LOAD_FACTORS, INTEREST_RATES, DEPRECIATION_RATES } from '../types/calculator';
import { calculateRoi } from '../utils/calculations';
import { formatIndianCurrency, formatNumber } from '../utils/formatting';
import { convertToNm3, getLiquidToGasConversionFactor } from '../utils/conversions';
import { ReportLayout } from './ReportLayout';
import DownloadPdfButton from './DownloadPdfButton';

export default function PSAVsLiquid() {
  const [inputs, setInputs] = useState<RoiInputs>({
    gasType: 'nitrogen',
    liquidUsedPerDay: 10000,
    liquidUnit: 'Sm3',
    plantRunningHours: 24,
    workingDaysPerMonth: 25,
    gasCost: 15,
    gasCostUnit: 'Nm3',
    monthlyRentalCost: 50000,
    purity: 95,
    loadFactor: 0.9,
    powerCostPerUnit: 8,
    psaPlantFlow: 0,
    compressorKW: 0,
    investmentCost: 5000000,
    annualMaintenanceCost: 75000,
    interestRate: 0,
    depreciationRate: 0,
    gasUsedPerDay: 0, // Add missing property
  });

  const reportRef = useRef<HTMLDivElement>(null);

  const unitPricePerNm3 = convertToNm3(inputs.gasCost, inputs.gasCostUnit, inputs.gasType);
  const gasUsedPerDay = (inputs.liquidUsedPerDay || 0) * getLiquidToGasConversionFactor(inputs.liquidUnit || 'Sm3', inputs.gasType);
  const result = calculateRoi({...inputs, unitPricePerNm3, gasUsedPerDay});
  const monthlyMaintenanceCostPerMonth = (inputs.annualMaintenanceCost ?? 0) / 12;
  const monthlyPSACost = (result.monthlyConsumption ?? 0) * (result.unitPricePSA ?? 0) + monthlyMaintenanceCostPerMonth + ((result.annualInterest ?? 0) / 12) - ((result.annualDepreciation ?? 0) / 12);
  const monthlySavings = (result.monthlyExpenseCylinder ?? 0) - monthlyPSACost;
  
  // Axis tick formatter for INR in Lakhs (short form)
  const formatAxisINRShort = (value: number) => `₹${(Number(value) / 100000).toFixed(1)}L`;

  // Currency label for bar tops
  const CurrencyBarLabel = (props: any) => {
    const { x, y, value } = props;
    if (value == null) return null;
    return (
      <text x={x} y={y} dy={-6} fill="#111827" fontSize={12} textAnchor="middle">
        {formatIndianCurrency(Number(value))}
      </text>
    );
  };
  
  const chartData = [
    {
      name: 'Current Liquid Supply',
      'Monthly Cost': result.monthlyExpenseCylinder ?? 0,
      'Annual Cost': result.totalRunningCostCylinder ?? 0,
    },
    {
      name: 'Proposed PSA System',
      'Monthly Cost': monthlyPSACost,
      'Annual Cost': result.totalRunningCostPSA ?? 0,
    },
  ];

  const yearlyData = Array.from({ length: 10 }, (_, i) => {
    const year = i + 1;
    const cumulativeSavings = (result.annualSavings ?? 0) * year;
    return {
      year: `Year ${year}`,
      'Current System Cost': (result.totalRunningCostCylinder ?? 0) * year,
      'PSA System Cost': (result.totalRunningCostPSA ?? 0) * year,
      'Cumulative Savings': cumulativeSavings,
    };
  });

  const roiData = Array.from({ length: 10 }, (_, i) => {
    const year = i + 1;
    const cumulativeCashFlow = -(inputs.investmentCost ?? 0) + (result.annualSavings ?? 0) * year;
    return {
      year: `Year ${year}`,
      cumulativeCashFlow: cumulativeCashFlow,
    };
  });

  // Separate scales for Monthly vs Annual bars so both are visible
  const monthlyMax = Math.max(
    chartData[0]['Monthly Cost'] || 0,
    chartData[1]['Monthly Cost'] || 0
  ) || 1;
  const annualMax = Math.max(
    chartData[0]['Annual Cost'] || 0,
    chartData[1]['Annual Cost'] || 0
  ) || 1;

  // ROI axis domain to ensure line visibility
  const roiMin = Math.min(...roiData.map(d => d.cumulativeCashFlow));
  const roiMax = Math.max(...roiData.map(d => d.cumulativeCashFlow));
  const roiRange = Math.max(roiMax - roiMin, 1);
  const roiBuffer = roiRange * 0.05;

  const breakEvenYearIndex = Math.ceil((result.paybackPeriodMonths ?? 0) / 12);
  const breakEvenYearLabel = breakEvenYearIndex > 0 ? `Year ${breakEvenYearIndex}` : undefined;

  const availablePurities = inputs.gasType === 'oxygen' ? OXYGEN_PURITIES : PURITIES;

  const inputParametersSummary = (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="font-semibold text-gray-900 mb-4">Input Parameters</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Gas Type:</span><span className="font-medium">{inputs.gasType}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Daily Use:</span><span className="font-medium">{inputs.liquidUsedPerDay} {inputs.liquidUnit}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Running Hours:</span><span className="font-medium">{inputs.plantRunningHours} hrs/day</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Working Days:</span><span className="font-medium">{inputs.workingDaysPerMonth} days/month</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Current Gas Cost:</span><span className="font-medium">{inputs.gasCost} ₹/{inputs.gasCostUnit}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Monthly Rental:</span><span className="font-medium">{formatIndianCurrency(inputs.monthlyRentalCost ?? 0)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Purity:</span><span className="font-medium">{inputs.purity}%</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Power Cost:</span><span className="font-medium">{inputs.powerCostPerUnit} ₹/kWh</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Investment Cost:</span><span className="font-medium">{formatIndianCurrency(inputs.investmentCost ?? 0)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Annual Maintenance:</span><span className="font-medium">{formatIndianCurrency(inputs.annualMaintenanceCost ?? 0)}</span></div>
      </div>
    </div>
  );

  const costComparisonContent = (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg border">
        <div className="flex items-center space-x-2 mb-4">
          <DollarSign className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Current System Costs</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Consumption:</span>
            <span className="font-medium">{formatNumber(result.monthlyConsumption)} Nm3</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Unit Cost:</span>
            <span className="font-medium">₹{formatNumber(result.unitPricePerM3, 2)}/Nm3</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Gas Cost:</span>
            <span className="font-medium">{formatIndianCurrency((result.monthlyConsumption ?? 0) * (result.unitPricePerM3 ?? 0))}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Rental:</span>
            <span className="font-medium">{formatIndianCurrency(inputs.monthlyRentalCost ?? 0)}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Total Monthly Cost:</span>
              <span className="font-bold text-lg text-blue-600">{formatIndianCurrency(result.monthlyExpenseCylinder)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-lg border">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">PSA System Costs</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Per Hour Consumption:</span>
            <span className="font-medium">{formatNumber(result.perHourConsumption)} Nm3/hr</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Plant Selected:</span>
            <span className="font-medium">{result.psaPlantFlow ? formatNumber(result.psaPlantFlow) : 'N/A'} Nm3/hr</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Compressor KW:</span>
            <span className="font-medium">{result.compressorKW ? formatNumber(result.compressorKW) : 'N/A'} kW</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Power Consumption:</span>
            <span className="font-medium">{formatNumber(result.power)} kW</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Unit Cost PSA:</span>
            <span className="font-medium">₹{formatNumber(result.unitPricePSA, 2)}/Nm3</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Power Cost:</span>
            <span className="font-medium">{formatIndianCurrency((result.monthlyConsumption ?? 0) * (result.unitPricePSA ?? 0))}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Maintenance:</span>
            <span className="font-medium">{formatIndianCurrency(monthlyMaintenanceCostPerMonth)}</span>
          </div>
          {result.annualInterest > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monthly Interest:</span>
              <span className="font-medium">{formatIndianCurrency(result.annualInterest / 12)}</span>
            </div>
          )}
          {result.annualDepreciation > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monthly Depreciation (Tax Deduction):</span>
              <span className="font-medium text-green-600">-{formatIndianCurrency(result.annualDepreciation / 12)}</span>
            </div>
          )}
          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Total Monthly Cost:</span>
              <span className="font-bold text-lg text-green-600">{formatIndianCurrency(monthlyPSACost)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const resultsContent = (
    <div className="lg:col-span-2 space-y-6">
      {costComparisonContent}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">Monthly & Annual Cost Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `₹${(Number(value)/100000).toFixed(1)}L`} />
              <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="Monthly Cost" fill="#3b82f6" name="Monthly Cost" />
              <Bar dataKey="Annual Cost" fill="#10b981" name="Annual Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">Return on Investment (ROI)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={roiData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => `₹${(Number(value)/100000).toFixed(1)}L`} />
              <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
              <Legend />
              <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="cumulativeCashFlow" stroke="#8884d8" strokeWidth={3} name="Cumulative Cash Flow" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">10-Year Cumulative Savings</h3>
        </div>
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex items-center justify-end gap-3 print:hidden">
        <DownloadPdfButton contentToPrint={reportRef} tabName={'PSA_Vs_Liquid'} inputs={inputs} />
      </div>

      {/* Screen View */}
      <div className="print:hidden p-6">
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center space-x-2 mb-4">
                <Calculator className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">System Configuration</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gas Type</label>
                  <select
                    value={inputs.gasType ?? 'nitrogen'}
                    onChange={(e) => setInputs({...inputs, gasType: e.target.value as 'nitrogen' | 'oxygen', purity: 95})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    aria-label="Gas Type"
                    title="Gas Type"
                  >
                    {GAS_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Use</label>
                  <input
                    type="number"
                    value={inputs.liquidUsedPerDay ?? ''}
                    onChange={(e) => setInputs({...inputs, liquidUsedPerDay: Number(e.target.value)})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    title="Daily Use"
                    placeholder="Enter daily use"
                  />
                  <p className="text-xs text-gray-500 mt-1">Daily Use in Nm3: {((inputs.liquidUsedPerDay || 0) * getLiquidToGasConversionFactor(inputs.liquidUnit || 'Sm3', inputs.gasType)).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={inputs.liquidUnit ?? 'Sm3'}
                    onChange={(e) => setInputs({...inputs, liquidUnit: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    aria-label="Liquid Unit"
                    title="Liquid Unit"
                  >
                    {LIQUID_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hours/Day</label>
                    <input
                      type="number"
                      value={inputs.plantRunningHours ?? ''}
                      onChange={(e) => setInputs({...inputs, plantRunningHours: Number(e.target.value)})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      title="Hours/Day"
                      placeholder="Enter hours per day"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Days/Month</label>
                    <input
                      type="number"
                      value={inputs.workingDaysPerMonth ?? ''}
                      onChange={(e) => setInputs({...inputs, workingDaysPerMonth: Number(e.target.value)})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      title="Days/Month"
                      placeholder="Enter days per month"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Gas Cost</label>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <input
                      type="number"
                      value={inputs.gasCost ?? ''}
                      onChange={(e) => setInputs({...inputs, gasCost: Number(e.target.value)})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      aria-label="Current Gas Cost"
                      title="Current Gas Cost"
                      placeholder="Enter gas cost"
                    />
                    <select
                      value={inputs.gasCostUnit ?? 'Nm3'}
                      onChange={(e) => setInputs({...inputs, gasCostUnit: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      aria-label="Gas Cost Unit"
                    >
                      <option value="Sm3">Sm3</option>
                      <option value="Nm3">Nm3</option>
                      <option value="Kg">Kg</option>
                      <option value="Liters">Liters</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Cost per Nm3: {formatNumber(unitPricePerNm3, 2)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rental (₹)</label>
                  <input
                    type="number"
                    value={inputs.monthlyRentalCost || 0}
                    onChange={(e) => setInputs({...inputs, monthlyRentalCost: Number(e.target.value)})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    title="Monthly Rental (₹)"
                    placeholder="Enter monthly rental cost"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purity (%)</label>
                  <select
                    value={inputs.purity ?? 95}
                    onChange={(e) => setInputs({...inputs, purity: Number(e.target.value)})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    aria-label="Purity"
                    title="Purity"
                  >
                    {availablePurities.map(purity => (
                      <option key={purity} value={purity}>{purity}%</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Load Factor</label>
                  <select
                    value={inputs.loadFactor ?? 0.9}
                    onChange={(e) => setInputs({...inputs, loadFactor: Number(e.target.value)})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    aria-label="Load Factor"
                    title="Load Factor"
                  >
                    {LOAD_FACTORS.map(factor => (
                      <option key={factor} value={factor}>{factor}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Power Cost (₹/kWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.powerCostPerUnit ?? ''}
                    onChange={(e) => setInputs({...inputs, powerCostPerUnit: Number(e.target.value)})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    title="Power Cost (₹/kWh)"
                    placeholder="Enter power cost per kWh"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Investment Cost (₹)</label>
                  <input
                    type="number"
                    value={inputs.investmentCost ?? ''}
                    onChange={(e) => setInputs({...inputs, investmentCost: Number(e.target.value)})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    title="Investment Cost (₹)"
                    placeholder="Enter investment cost"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Maintenance (₹)</label>
                  <input
                    type="number"
                    value={inputs.annualMaintenanceCost ?? ''}
                    onChange={(e) => setInputs({...inputs, annualMaintenanceCost: Number(e.target.value)})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    title="Annual Maintenance (₹)"
                    placeholder="Enter annual maintenance cost"
                  />
                </div>

                <div className={`${(inputs.interestRate ?? 0) === 0 ? 'print-hidden' : ''}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                  <select
                    value={inputs.interestRate ?? 0}
                    onChange={(e) => setInputs({...inputs, interestRate: Number(e.target.value)})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    aria-label="Interest Rate"
                    title="Interest Rate"
                  >
                    {INTEREST_RATES.map(rate => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </div>

                <div className={`${(inputs.depreciationRate ?? 0) === 0 ? 'print-hidden' : ''}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Depreciation Rate (%)</label>
                  <select
                    value={inputs.depreciationRate ?? 0}
                    onChange={(e) => setInputs({...inputs, depreciationRate: Number(e.target.value)})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    aria-label="Depreciation Rate"
                    title="Depreciation Rate"
                  >
                    {DEPRECIATION_RATES.map(rate => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {resultsContent}
        </div>
      </div>

      {/* Print View */}
      <ReportLayout
        ref={reportRef}
        title="PSA vs. Liquid Supply: A Cost-Benefit Analysis"
        summary={
          <p className="text-justify">
            This report presents a comprehensive financial analysis comparing the current expenditure on liquid nitrogen/oxygen supply with the projected costs and savings of implementing an on-site PSA (Pressure Swing Adsorption) generation plant. The evaluation indicates substantial long-term financial benefits, a rapid return on investment, and enhanced operational autonomy.
          </p>
        }
        pageOneContent={<>
      {inputParametersSummary}
      {costComparisonContent}
    </>}
      >
        <>
      {/* Page 2: Financial Summary & Charts */}
      <div className="print-page space-y-8">
        <div className="avoid-break">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 p-6 rounded-r-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              Financial Summary & Investment Analysis
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="bg-white p-6 rounded-lg border border-green-200 shadow-sm">
                <div className="text-4xl font-bold text-green-600 mb-2">{formatIndianCurrency(monthlySavings)}</div>
                <div className="text-sm font-medium text-green-800">Estimated Monthly Savings</div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
                <div className="text-4xl font-bold text-blue-600 mb-2">{formatIndianCurrency(result.annualSavings ?? 0)}</div>
                <div className="text-sm font-medium text-blue-800">Estimated Annual Savings</div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-purple-200 shadow-sm">
                <div className="text-4xl font-bold text-purple-600 mb-2">{result.roiPercentage?.toFixed(1)}%</div>
                <div className="text-sm font-medium text-purple-800">Return on Investment (ROI)</div>
                <div className="text-xs text-gray-500 mt-1">Payback in {result.paybackPeriodMonths?.toFixed(1)} months</div>
              </div>
            </div>
          </div>
        </div>

        <div className="avoid-break">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Visual Cost Comparison</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="font-semibold text-gray-900 mb-4 text-center">Monthly & Annual Cost Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => formatAxisINRShort(Number(value))} domain={[0, monthlyMax * 1.2]} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatAxisINRShort(Number(value))} domain={[0, annualMax * 1.2]} />
                  <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="Monthly Cost" fill="#3b82f6" name="Monthly Cost">
                    <LabelList position="top" content={CurrencyBarLabel} />
                  </Bar>
                  <Bar yAxisId="right" dataKey="Annual Cost" fill="#10b981" name="Annual Cost">
                    <LabelList position="top" content={CurrencyBarLabel} />
                  </Bar>
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
                    stroke="#2563eb" /* blue-600 for clear print visibility */
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

      {/* Page 3: Business Case & Recommendation */}
      <div className="print-page space-y-8">
        <div className="avoid-break">
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50 border-l-4 border-indigo-600 p-6 rounded-r-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              Business Case & Recommendation
            </h2>
            <div className="space-y-4 text-gray-700 leading-relaxed text-justify">
              <p>
                Transitioning from liquid supply to an on-site PSA plant presents a compelling financial and operational advantage. With projected monthly savings of <span className="font-semibold text-green-700">{formatIndianCurrency(monthlySavings)}</span> and annual savings of <span className="font-semibold text-green-700">{formatIndianCurrency(result.annualSavings ?? 0)}</span>, the initial investment is quickly recovered, leading to significant long-term cost reduction.
              </p>
              <p>
                The calculated return on investment of <span className="font-semibold text-blue-700">{result.roiPercentage ? `${result.roiPercentage.toFixed(1)}%` : 'N/A'}</span>, with a payback period of just <span className="font-semibold text-blue-700">{result.paybackPeriodMonths ? `${result.paybackPeriodMonths.toFixed(1)} months` : 'N/A'}</span>, underscores the financial viability of this project. Beyond the numbers, on-site generation eliminates dependence on external suppliers, mitigates logistical risks, and reduces the carbon footprint associated with liquid gas deliveries.
              </p>
              <p className="font-semibold">
                Recommendation: We strongly recommend proceeding with the implementation of the PSA generation system to realize immediate cost savings, improve operational efficiency, and achieve supply chain independence.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-900">10-Year Cumulative Savings</h3>
          </div>
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
