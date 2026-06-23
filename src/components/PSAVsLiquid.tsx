// src/components/PSAVsLiquid.tsx
import { useState, useRef, useEffect } from 'react';
import { Calculator, DollarSign, Zap, IndianRupee } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { RoiInputs, GAS_TYPES, LIQUID_UNITS, PURITIES, OXYGEN_PURITIES, INTEREST_RATES, DEPRECIATION_RATES, LOAD_FACTORS_LIQUID as LOAD_FACTORS } from '../types/calculator';
import { calculateRoi } from '../utils/calculations';
import { formatIndianCurrency, formatLoadFactor, formatNumber } from '../utils/formatting';
import { convertToNm3, getLiquidToGasConversionFactor } from '../utils/conversions';
import { ReportLayout } from './ReportLayout';
import DownloadPdfButton from './DownloadPdfButton';
import { StaticMonthlyAnnualCostChart } from './StaticChartComponents';

// Lufga font faces
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

// Common Y-axis tick formatter for Lakhs (used in both UI and PDF)
const formatToLakhs = (value: number): string => {
  const val = Number(value);
  const lakhs = Math.abs(val) / 100000;
  const isNegative = val < 0;
  const sign = isNegative ? '-' : '';
  return `${sign}₹${lakhs.toFixed(1)}L`;
};

export default function PSAVsLiquid() {
  const [inputs, setInputs] = useState<RoiInputs>({
    gasType: 'nitrogen',
    liquidUsedPerDay: 10000,
    liquidUnit: 'Sm³',
    plantRunningHours: 24,
    workingDaysPerMonth: 25,
    gasCost: 15,
    gasCostUnit: 'Nm³',
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
    gasUsedPerDay: 0,
  });

  const reportRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const unitPricePerNm3 = convertToNm3(inputs.gasCost, inputs.gasCostUnit, inputs.gasType);
  const gasUsedPerDay = (inputs.liquidUsedPerDay || 0) * getLiquidToGasConversionFactor(inputs.liquidUnit || 'Sm³', inputs.gasType);
  const result = calculateLiquidRoi({...inputs, unitPricePerNm3, gasUsedPerDay});
  const monthlyMaintenanceCostPerMonth = (inputs.annualMaintenanceCost ?? 0) / 12;
  const monthlyPSACost = (result.monthlyConsumption ?? 0) * (result.unitPricePSA ?? 0) + monthlyMaintenanceCostPerMonth + ((result.annualInterest ?? 0) / 12) - ((result.annualDepreciation ?? 0) / 12);
  const monthlySavings = (result.monthlyExpenseCylinder ?? 0) - monthlyPSACost;
  
  // Axis tick formatter for INR in Lakhs (short form) - for UI bar chart
  const formatAxisINRShort = (value: number) => `₹${(Number(value) / 100000).toFixed(1)}L`;

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

  // ROI axis domain to ensure line visibility
  const roiMin = Math.min(...roiData.map(d => d.cumulativeCashFlow));
  const roiMax = Math.max(...roiData.map(d => d.cumulativeCashFlow));
  const roiRange = Math.max(roiMax - roiMin, 1);
  const roiBuffer = roiRange * 0.05;

  const breakEvenYearIndex = Math.ceil((result.paybackPeriodMonths ?? 0) / 12);
  const breakEvenYearLabel = breakEvenYearIndex > 0 && breakEvenYearIndex <= 10 ? `Year ${breakEvenYearIndex}` : undefined;

  const availablePurities = inputs.gasType === 'oxygen' ? OXYGEN_PURITIES : PURITIES;
  const maxCompressorAirFlow = Math.max(...COMPRESSOR_DATA.map((compressor) => compressor.airFlow));
  const liquidFlowDataSource = inputs.gasType === 'oxygen' ? OXYGEN_FLOW_DATA : FLOW_DATA;
  const availableLiquidFlows = liquidFlowDataSource
    .filter((data) => data.purity === inputs.purity && data.airRequirement <= maxCompressorAirFlow)
    .map((data) => data.flow)
    .sort((a, b) => a - b);
  const defaultLiquidUnitFlow = availableLiquidFlows[availableLiquidFlows.length - 1];
  // Threshold = max single-unit flow for current gas+purity; matches liquidCalculations.ts logic
  // Oxygen (purity 95): ~250 NM³/hr  |  Nitrogen (purity-dependent): up to ~2362 NM³/hr
  const LARGE_FLOW_THRESHOLD = availableLiquidFlows.length > 0 ? Math.max(...availableLiquidFlows) : 2362;
  
  // Helper to capitalize first letter for gas type display
  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // UI Chart Component (Recharts - stays the same)
  const monthlyAnnualCostComparisonChart = (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => formatAxisINRShort(Number(value))} />
        <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
        <Legend />
        <Bar dataKey="Monthly Cost" fill="#3b82f6" name="Monthly Cost" />
        <Bar dataKey="Annual Cost" fill="#10b981" name="Annual Cost" />
      </BarChart>
    </ResponsiveContainer>
  );

  // ROI Chart Component (Recharts - for both UI and PDF with consistent Lakhs format)
  const roiChartComponent = (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={roiData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis 
          tickFormatter={formatToLakhs}
          domain={[roiMin - roiBuffer, roiMax + roiBuffer]}
        />
        <Tooltip 
          formatter={(value) => {
            const val = Number(value);
            const lakhs = Math.abs(val) / 100000;
            const isNegative = val < 0;
            const sign = isNegative ? '-' : '';
            return `${sign}₹${lakhs.toFixed(1)} Lakhs`;
          }}
        />
        <Legend />
        <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" label={{ value: 'Break-even', position: 'top', fill: '#ef4444', fontSize: 11 }} />
        <Line 
          type="monotone" 
          dataKey="cumulativeCashFlow" 
          stroke="#8884d8" 
          strokeWidth={3} 
          name="Cumulative Cash Flow"
          dot={{ r: 4, fill: "#8884d8" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const inputParametersSummary = (
    <div className="bg-white p-6 rounded-lg shadow border" style={{ breakInside: 'avoid' }}>
      <h3 className="text-gray-900 mb-4" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Input Parameters</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Gas Type:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{capitalizeFirstLetter(inputs.gasType)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Daily Use:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.liquidUsedPerDay} {inputs.liquidUnit}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Running Hours:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.plantRunningHours} hrs/day</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Working Days:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.workingDaysPerMonth} days/month</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Current Gas Cost:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.gasCost} ₹/{inputs.gasCostUnit}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Monthly Rental:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(inputs.monthlyRentalCost ?? 0)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Purity:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.purity}%</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Power Cost:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{inputs.powerCostPerUnit} ₹/kWh</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Investment Cost:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(inputs.investmentCost ?? 0)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Annual Maintenance:</span><span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(inputs.annualMaintenanceCost ?? 0)}</span></div>
      </div>
    </div>
  );

  const costComparisonContent = (
    <div className="grid md:grid-cols-2 gap-6" style={{ breakInside: 'avoid' }}>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg border">
        <div className="flex items-center space-x-2 mb-4">
          <IndianRupee className="h-5 w-5 text-blue-600" />
          <h3 className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Current System Costs</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Consumption:</span>
            <span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatNumber(result.monthlyConsumption)} Nm³</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Unit Cost:</span>
            <span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>₹{formatNumber(result.unitPricePerM3, 2)}/Nm³</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Gas Cost:</span>
            <span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency((result.monthlyConsumption ?? 0) * (result.unitPricePerM3 ?? 0))}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Rental:</span>
            <span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(inputs.monthlyRentalCost ?? 0)}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Total Monthly Cost:</span>
              <span className="font-bold text-lg text-blue-600">{formatIndianCurrency(result.monthlyExpenseCylinder)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-lg border">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="h-5 w-5 text-green-600" />
          <h3 className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>PSA System Costs</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Per Hour Consumption:</span>
            <span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatNumber(result.perHourConsumption)} Nm³/hr</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">PSA Plant Flow:</span>
            <span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{result.psaPlantFlow ? formatNumber(result.psaPlantFlow) : 'N/A'} Nm³/hr</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Compressor KW:</span>
            <span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{result.compressorKW ? formatNumber(result.compressorKW) : 'N/A'} kW</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Power Consumption:</span>
            <span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatNumber(result.power)} kW</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Unit Cost PSA:</span>
            <span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>₹{formatNumber(result.unitPricePSA, 2)}/Nm³</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Power Cost:</span>
            <span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency((result.monthlyConsumption ?? 0) * (result.unitPricePSA ?? 0))}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Maintenance:</span>
            <span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(monthlyMaintenanceCostPerMonth)}</span>
          </div>
          {result.annualInterest > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monthly Interest:</span>
              <span className="" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(result.annualInterest / 12)}</span>
            </div>
          )}
          {result.annualDepreciation > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monthly Depreciation (Tax Deduction):</span>
              <span className="text-green-600" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>-{formatIndianCurrency(result.annualDepreciation / 12)}</span>
            </div>
          )}
          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Total Monthly Cost:</span>
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
          <h3 className="text-gray-900 mb-4 text-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Monthly & Annual Cost Comparison</h3>
          {monthlyAnnualCostComparisonChart}
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-gray-900 mb-4 text-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Return on Investment (ROI)</h3>
          {roiChartComponent}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h3 className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>10-Year Cumulative Savings</h3>
        </div>
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
        <DownloadPdfButton contentToPrint={reportRef} tabName={'PSA_Vs_Liquid'} inputs={inputs} />
      </div>

      {/* Screen View - UI remains exactly the same */}
      <div className="print:hidden p-6">
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center space-x-2 mb-4">
                <Calculator className="h-5 w-5 text-blue-600" />
                <h3 className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>System Configuration</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Gas Type</label>
                  <select
                    value={inputs.gasType ?? 'nitrogen'}
                    onChange={(e) => setInputs({...inputs, gasType: e.target.value as 'nitrogen' | 'oxygen', purity: 95, selectedFlow: undefined})}
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
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Daily Use</label>
                  <input
                    type="number"
                    value={inputs.liquidUsedPerDay ?? ''}
                    onChange={(e) => setInputs({...inputs, liquidUsedPerDay: Number(e.target.value)})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    title="Daily Use"
                    placeholder="Enter daily use"
                  />
                  <p className="text-xs text-gray-500 mt-1">Daily Use in Nm³: {((inputs.liquidUsedPerDay || 0) * getLiquidToGasConversionFactor(inputs.liquidUnit || 'Sm³', inputs.gasType)).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Unit</label>
                  <select
                    value={inputs.liquidUnit ?? 'Sm³'}
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
                    <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Hours/Day</label>
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
                    <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Days/Month</label>
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
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Current Gas Cost</label>
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
                      value={inputs.gasCostUnit ?? 'Nm³'}
                      onChange={(e) => setInputs({...inputs, gasCostUnit: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      aria-label="Gas Cost Unit"
                    >
                      <option value="Sm³">Sm³</option>
                      <option value="Nm³">Nm³</option>
                      <option value="Kg">Kg</option>
                      <option value="Liters">Liters</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Cost per Nm³: {formatNumber(unitPricePerNm3, 2)}</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Monthly Rental (₹)</label>
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
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Purity (%)</label>
                  <select
                    value={inputs.purity ?? 95}
                    onChange={(e) => setInputs({...inputs, purity: Number(e.target.value), selectedFlow: undefined})}
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
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Load Factor</label>
                  <select
                    value={inputs.loadFactor ?? 0.9}
                    onChange={(e) => setInputs({...inputs, loadFactor: Number(e.target.value)})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    aria-label="Load Factor"
                    title="Load Factor"
                  >
                    {LOAD_FACTORS.map(factor => (
                      <option key={factor} value={factor}>{formatLoadFactor(factor)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Power Cost (₹/kWh)</label>
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
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Investment Cost (₹)</label>
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
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Annual Maintenance (₹)</label>
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
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Interest Rate (%)</label>
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
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Depreciation Rate (%)</label>
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

                {result.perHourConsumption > LARGE_FLOW_THRESHOLD && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-1" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Select PSA Unit Flow</label>
                    <select
                      value={inputs.selectedFlow ?? defaultLiquidUnitFlow ?? ''}
                      onChange={(e) => setInputs({...inputs, selectedFlow: e.target.value ? Number(e.target.value) : undefined})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      aria-label="Select PSA Unit Flow"
                      title="Select PSA Unit Flow"
                    >
                      {availableLiquidFlows.map((flow) => (
                        <option key={flow} value={flow}>{flow} Nm³/hr</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            {resultsContent}
        </div>
      </div>

      {/* Print View - PDF Report */}
      <ReportLayout
        ref={reportRef}
        title="PSA vs. Liquid Supply: A Cost-Benefit Analysis"
        summary={
          <p className="text-justify">
            This report presents a comprehensive financial analysis comparing the current expenditure on liquid nitrogen/oxygen supply with the projected costs and savings of implementing an on-site PSA (Pressure Swing Adsorption) generation plant. The evaluation indicates substantial long-term financial benefits, a rapid return on investment, and enhanced operational autonomy.
          </p>
        }
        pageOneContent={
          <div className="space-y-6">
            {inputParametersSummary}
            {costComparisonContent}
          </div>
        }
      >
        <>
          {/* Page 2: Financial Summary & Investment Analysis - PDF NEW STRUCTURE */}
          <div className="print-page space-y-8">
            {/* Financial Summary Cards */}
            <div className="avoid-break">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 p-6 rounded-r-lg">
                <h2 className="text-2xl text-gray-800 mb-4 flex items-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>2</span>
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

            {/* Row 1: Monthly Cost Comparison - Full Width (PDF static chart) */}
            <div className="avoid-break">
              <div className="bg-white p-6 rounded-lg shadow border">
                {isClient && (
                  <StaticMonthlyAnnualCostChart 
                    data={chartData} 
                    width="100%" 
                    height={350}
                    chartType="monthly"
                  />
                )}
              </div>
            </div>

            {/* Row 2: Annual Cost Comparison - Full Width (PDF static chart) */}
            <div className="avoid-break">
              <div className="bg-white p-6 rounded-lg shadow border">
                {isClient && (
                  <StaticMonthlyAnnualCostChart 
                    data={chartData} 
                    width="100%" 
                    height={350}
                    chartType="annual"
                  />
                )}
              </div>
            </div>

            {/* Row 3: ROI Graph - Using Recharts with consistent Lakhs format (same as UI) */}
            <div className="avoid-break">
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-gray-900 mb-4 text-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Return on Investment (ROI)</h3>
                <div style={{ width: '100%', height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={roiData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="year" 
                        tick={{ fontSize: 11 }}
                        interval={1}
                      />
                      <YAxis 
                        tickFormatter={formatToLakhs}
                        tick={{ fontSize: 11 }}
                        domain={[roiMin - roiBuffer, roiMax + roiBuffer]}
                      />
                      <Tooltip 
                        formatter={(value) => {
                          const val = Number(value);
                          const lakhs = Math.abs(val) / 100000;
                          const isNegative = val < 0;
                          const sign = isNegative ? '-' : '';
                          return `${sign}₹${lakhs.toFixed(1)} Lakhs`;
                        }}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Legend />
                      <ReferenceLine 
                        y={0} 
                        stroke="#000" 
                        strokeDasharray="3 3" 
                        label={{ 
                          value: 'Break-even', 
                          position: 'top', 
                          fill: '#ef4444', 
                          fontSize: 11,
                          fontWeight: 'bold'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulativeCashFlow" 
                        stroke="#8884d8" 
                        strokeWidth={3} 
                        name="Cumulative Cash Flow"
                        dot={{ r: 4, fill: "#8884d8" }}
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
                <h2 className="text-2xl text-gray-800 mb-4 flex items-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>3</span>
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
            
            {/* 10-Year Cumulative Savings Table for PDF */}
            <div className="bg-white rounded-lg shadow border overflow-hidden" style={{ breakInside: 'avoid' }}>
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h3 className="text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>10-Year Cumulative Savings</h3>
              </div>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(row['Current System Cost'])}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{formatIndianCurrency(row['PSA System Cost'])}</td>
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