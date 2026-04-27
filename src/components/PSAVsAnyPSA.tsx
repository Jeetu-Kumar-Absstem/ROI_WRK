
import { useState, useEffect, useRef } from 'react';
import ModelSelector from './ModelSelector.tsx';
import { Calculator } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell } from 'recharts';
import OperationalParams from './OperationalParams.tsx';
import ComparisonResult from './ComparisonResult.tsx';
import CompetitionInput from './CompetitionInput.tsx';
import { OperationalParams as OperationalParamsType } from './types.ts';
import { calculateResults } from './calculator';
import { ReportLayout } from './ReportLayout.tsx';
import DownloadPdfButton from './DownloadPdfButton';
import { formatIndianCurrency, formatNumber } from '../utils/formatting';

function PSAVsAnyPSA() {
  // State for operational parameters
  const [operationalParams, setOperationalParams] = useState<OperationalParamsType>({
    powerCostPerUnit: 9,
    totalRunningHours: 8000,
    flowRequired: 300,
  });
  const [gasType, setGasType] = useState<'nitrogen' | 'oxygen'>('nitrogen');

  // State for Absstem model and compressor selection
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedCompressor, setSelectedCompressor] = useState<any>(null);
  const [absstemUtilization, setAbsstemUtilization] = useState<number>(0.9);
  const [absstemPlantCost, setAbsstemPlantCost] = useState<number>(5000000);

  // State for competition data
  const [competitionData, setCompetitionData] = useState({
    flow: 100,
    compressorKW: 75,
    plantCost: 5000000,
    specificPower: 0.5,
    utilizationFactor: 1.0
  });

  // State for calculated results
  const [results, setResults] = useState<any>({
    absstem: {
      model: null,
      compressor: null,
      nitrogenSupply: 0,
      compressorKW: 0,
      totalInputPower: 0,
      specificPower: 0,
      utilizationFactor: 0,
      plantCost: 0,
      annualPowerCost: 0,
      tenYearCost: 0
    },
    competition: {
      flow: 0,
      compressorKW: 0,
      totalInputPower: 0,
      specificPower: 0,
      utilizationFactor: 0,
      plantCost: 0,
      annualPowerCost: 0,
      tenYearCost: 0
    },
    comparison: {
      annualSavings: 0,
      totalSavings: 0,
      roi: 0,
      yearlyData: []
    }
  });

  const reportRef = useRef<HTMLDivElement>(null);

  // Calculate results when inputs change
  useEffect(() => {
    if (selectedModel && selectedCompressor) {
      const calcData = {
        absstem: {
          model: selectedModel,
          compressor: selectedCompressor,
          plantCost: absstemPlantCost,
          utilizationFactor: absstemUtilization
        },
        competition: competitionData,
        params: operationalParams
      };
      
      const calculatedResults = calculateResults(calcData);
      setResults(calculatedResults);
    }
  }, [
    selectedModel, 
    selectedCompressor, 
    operationalParams, 
    competitionData, 
    absstemPlantCost,
    absstemUtilization
  ]);

  const inputParametersSummary = (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="font-semibold text-gray-900 mb-4">Input Parameters</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Gas Type:</span><span className="font-medium">{gasType}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Flow Required:</span><span className="font-medium">{operationalParams.flowRequired} Nm3/hr</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Total Running Hours:</span><span className="font-medium">{operationalParams.totalRunningHours} hrs/year</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Power Cost:</span><span className="font-medium">{operationalParams.powerCostPerUnit} ₹/kWh</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Absstem Plant Cost:</span><span className="font-medium">{formatIndianCurrency(absstemPlantCost)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Absstem Utilization:</span><span className="font-medium">{absstemUtilization * 100}%</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Competition Flow:</span><span className="font-medium">{competitionData.flow} Nm3/hr</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Competition Compressor KW:</span><span className="font-medium">{competitionData.compressorKW} kW</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Competition Plant Cost:</span><span className="font-medium">{formatIndianCurrency(competitionData.plantCost)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Competition Specific Power:</span><span className="font-medium">{competitionData.specificPower}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Competition Utilization:</span><span className="font-medium">{competitionData.utilizationFactor * 100}%</span></div>
      </div>
    </div>
  );

  const costComparisonContent = (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg border">
        <h3 className="font-semibold text-gray-900 mb-4">Absstem System Costs</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Model:</span><span className="font-medium">{results.absstem.model?.name}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Compressor:</span><span className="font-medium">{results.absstem.compressor?.name}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Nitrogen Supply:</span><span className="font-medium">{formatNumber(results.absstem.nitrogenSupply)} Nm3/hr</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Compressor KW:</span><span className="font-medium">{formatNumber(results.absstem.compressorKW)} kW</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Total Input Power:</span><span className="font-medium">{formatNumber(results.absstem.totalInputPower)} kW</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Specific Power:</span><span className="font-medium">{formatNumber(results.absstem.specificPower, 3)}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Utilization Factor:</span><span className="font-medium">{formatNumber(results.absstem.utilizationFactor * 100)}%</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Annual Power Cost:</span><span className="font-medium">{formatIndianCurrency(results.absstem.annualPowerCost)}</span></div>
          <div className="border-t pt-3"><div className="flex justify-between items-center"><span className="font-medium text-gray-900">10 Year Cost:</span><span className="font-bold text-lg text-blue-600">{formatIndianCurrency(results.absstem.tenYearCost)}</span></div></div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-lg border">
        <h3 className="font-semibold text-gray-900 mb-4">Competition System Costs</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Flow:</span><span className="font-medium">{formatNumber(results.competition.flow)} Nm3/hr</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Compressor KW:</span><span className="font-medium">{formatNumber(results.competition.compressorKW)} kW</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Total Input Power:</span><span className="font-medium">{formatNumber(results.competition.totalInputPower)} kW</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Specific Power:</span><span className="font-medium">{formatNumber(results.competition.specificPower, 3)}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Utilization Factor:</span><span className="font-medium">{formatNumber(results.competition.utilizationFactor * 100)}%</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Annual Power Cost:</span><span className="font-medium">{formatIndianCurrency(results.competition.annualPowerCost)}</span></div>
          <div className="border-t pt-3"><div className="flex justify-between items-center"><span className="font-medium text-gray-900">10 Year Cost:</span><span className="font-bold text-lg text-green-600">{formatIndianCurrency(results.competition.tenYearCost)}</span></div></div>
        </div>
      </div>
    </div>
  );

  // Page 1: Use the same styled system result cards as shown on Page 3
  const gasName = gasType.charAt(0).toUpperCase() + gasType.slice(1);
  const pageOneSystemResults = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Absstem System Results */}
      <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500 shadow">
        <h4 className="text-lg font-semibold text-blue-800 mb-4">Absstem System</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Available {gasName} Flow:</span>
            <span className="font-medium">{formatNumber(results.absstem.nitrogenSupply)} Nm3/hr</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Compressor Power:</span>
            <span className="font-medium">{formatNumber(results.absstem.compressorKW)} kW</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Utilization Factor:</span>
            <span className="font-medium">{formatNumber(results.absstem.utilizationFactor, 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Input Power:</span>
            <span className="font-medium">{formatNumber(results.absstem.totalInputPower, 2)} kW</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Specific Power:</span>
            <span className="font-medium">{formatNumber(results.absstem.specificPower, 2)} kW/Nm3</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="text-gray-800">Plant Cost:</span>
            <span>{formatIndianCurrency(results.absstem.plantCost)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="text-gray-800">Annual Power Cost:</span>
            <span>{formatIndianCurrency(results.absstem.annualPowerCost)}</span>
          </div>
          <div className="flex justify-between text-blue-800 font-bold pt-3 border-t border-blue-200">
            <span>10-Year Lifecycle Cost:</span>
            <span>{formatIndianCurrency(results.absstem.tenYearCost)}</span>
          </div>
        </div>
      </div>

      {/* Competition System Results */}
      <div className="bg-orange-50 rounded-lg p-6 border-l-4 border-orange-500 shadow">
        <h4 className="text-lg font-semibold text-orange-800 mb-4">Competition System</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Available {gasName} Flow:</span>
            <span className="font-medium">{formatNumber(results.competition.flow)} Nm3/hr</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Compressor Power:</span>
            <span className="font-medium">{formatNumber(results.competition.compressorKW)} kW</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Utilization Factor:</span>
            <span className="font-medium">{formatNumber(results.competition.utilizationFactor, 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Input Power:</span>
            <span className="font-medium">{formatNumber(results.competition.totalInputPower, 2)} kW</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Specific Power:</span>
            <span className="font-medium">{formatNumber(results.competition.specificPower, 2)} kW/Nm3</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="text-gray-800">Plant Cost:</span>
            <span>{formatIndianCurrency(results.competition.plantCost)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="text-gray-800">Annual Power Cost:</span>
            <span>{formatIndianCurrency(results.competition.annualPowerCost)}</span>
          </div>
          <div className="flex justify-between text-orange-800 font-bold pt-3 border-t border-orange-200">
            <span>10-Year Lifecycle Cost:</span>
            <span>{formatIndianCurrency(results.competition.tenYearCost)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Currency axis formatter: show Lakhs for large values, Rs for small
  const formatAxisINRMixed = (value: number) => {
    const n = Number(value);
    if (!isFinite(n)) return '';
    return Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : formatIndianCurrency(n);
  };

  const resultsContent = (
    <div className="lg:col-span-2 space-y-6">
      {costComparisonContent}
      {selectedModel && selectedCompressor && (
        <ComparisonResult 
          gasType={gasType}
          absstemData={results.absstem} 
          competitionData={results.competition}
          comparison={results.comparison}
        />
      )}
    </div>
  );

  const reportContent = (
    <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Column */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex items-center space-x-2 mb-4">
              <Calculator className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">Input Parameters</h2>
            </div>
            <OperationalParams 
              params={operationalParams} 
              onParamChange={setOperationalParams} 
            />
          </div>
          <ModelSelector 
            gasType={gasType}
            onGasTypeChange={setGasType}
            onModelSelect={setSelectedModel} 
            utilizationFactor={absstemUtilization}
            onUtilizationChange={setAbsstemUtilization}
            onCompressorSelect={setSelectedCompressor}
          />
          <CompetitionInput 
            gasType={gasType}
            onCompetitionDataUpdate={setCompetitionData}
            absstemPlantCost={absstemPlantCost}
            onAbsstemPlantCostChange={setAbsstemPlantCost}
          />
        </div>
        {/* Results Column */}
        <div className="lg:col-span-2">
          {resultsContent}
        </div>
      </div>
    </main>
  );
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex items-center justify-end gap-3 print:hidden">
        <DownloadPdfButton contentToPrint={reportRef} tabName={'PSA_Vs_Any_PSA'} inputs={{
          operationalParams,
          gasType,
          selectedModel,
          selectedCompressor,
          absstemUtilization,
          absstemPlantCost,
          competitionData
        }} />
      </div>
      {/* Screen View */}
      <div className="print:hidden">
        {reportContent}
      </div>

      {/* Print View */}
      <ReportLayout
        ref={reportRef}
        title="Absstem PSA vs. Competitor PSA Performance & Cost Analysis"
        summary={<p className="text-justify">This comparative analysis evaluates the performance, efficiency, and long-term cost-effectiveness of an Absstem PSA system against a competitor's PSA system. The report highlights key differentiators in specific power consumption, operational costs, and return on investment, providing a clear basis for an informed procurement decision.</p>}
        pageOneContent={<>
          {inputParametersSummary}
          {pageOneSystemResults}
        </>}
      >
        <>
          {/* Page 2: Financial Summary & Investment Analysis */}
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
                    <div className="text-4xl font-bold text-green-600 mb-2">{formatIndianCurrency(results.comparison.annualSavings)}</div>
                    <div className="text-sm font-medium text-green-800">Estimated Annual Savings</div>
                  </div>
                  <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
                    <div className="text-4xl font-bold text-blue-600 mb-2">{formatIndianCurrency(results.comparison.totalSavings)}</div>
                    <div className="text-sm font-medium text-blue-800">Estimated 10-Year Savings</div>
                  </div>
                  <div className="bg-white p-6 rounded-lg border border-purple-200 shadow-sm">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{results.comparison.roi > 0 ? `${results.comparison.roi.toFixed(1)} Years` : 'Immediate/N/A'}</div>
                    <div className="text-sm font-medium text-purple-800">Return on Investment (Payback)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 10-Year Cumulative Cost Projection (moved from Page 3) */}
            <div className="avoid-break">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">10-Year Cumulative Cost Projection</h3>
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <LineChart width={900} height={400} data={results.comparison.yearlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                  <YAxis tickFormatter={(tick) => formatAxisINRMixed(Number(tick))} />
                  <Tooltip formatter={(value: number) => formatAxisINRMixed(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="absstemCost" name="Absstem" stroke="#10B981" strokeOpacity={1} strokeWidth={4} dot={{ r: 4 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="competitionCost" name="Competition" stroke="#3B82F6" strokeOpacity={1} strokeWidth={4} dot={{ r: 4 }} isAnimationActive={false} />
                </LineChart>
              </div>
            </div>

            {/* Total Input Power Comparison (kW) */}
            <div className="avoid-break">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Total Input Power Comparison (kW)</h3>
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <BarChart width={900} height={300} data={[{ name: 'Absstem', value: results.absstem.totalInputPower }, { name: 'Competition', value: results.competition.totalInputPower }]} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Power (kW)" isAnimationActive={false}>
                    <Cell fill="#10B981" /><Cell fill="#3B82F6" />
                  </Bar>
                </BarChart>
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
                    Upgrading to an Absstem PSA system demonstrates clear economic and operational advantages over the competitor’s setup. With projected annual savings of
                    <span className="font-semibold text-green-700"> {formatIndianCurrency(results.comparison.annualSavings)}</span> and cumulative ten-year savings of
                    <span className="font-semibold text-green-700"> {formatIndianCurrency(results.comparison.totalSavings)}</span>, the investment is supported by strong lifecycle economics.
                  </p>
                  <p>
                    The indicated payback period of
                    <span className="font-semibold text-blue-700"> {results.comparison.roi > 0 ? `${results.comparison.roi.toFixed(1)} years` : 'Immediate/N/A'}</span>
                    reflects efficient capital deployment. Beyond the financials, Absstem’s integrated design reduces energy consumption, simplifies maintenance, and provides single-vendor accountability for reliability and support.
                  </p>
                  <p className="font-semibold">Recommendation: Proceed with the Absstem PSA solution to achieve immediate operational efficiency gains, reduce long-term OPEX, and ensure dependable performance under a unified support framework.</p>
                </div>
              </div>
            </div>
            {/* 10-Year Cumulative Savings Table */}
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
                    {results.comparison.yearlyData
                      .filter((row: any) => typeof row.year === 'number' ? row.year >= 1 && row.year <= 10 : true)
                      .map((row: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{typeof row.year === 'number' ? `Year ${row.year}` : row.year}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatIndianCurrency(row.competitionCost)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatIndianCurrency(row.absstemCost)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatIndianCurrency(row.savings)}</td>
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

export default PSAVsAnyPSA;
