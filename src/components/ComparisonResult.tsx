import { formatCurrency } from './calculator';
import { TrendingUp } from 'lucide-react';
import ComparisonCharts from './ComparisonCharts';

interface ComparisonResultProps {
  gasType: 'nitrogen' | 'oxygen';
  absstemData: any;
  competitionData: any;
  comparison: any;
}

const ComparisonResult: React.FC<ComparisonResultProps> = ({ 
  gasType,
  absstemData, 
  competitionData, 
  comparison
}) => {
  if (!absstemData || !competitionData || !comparison) {
    return null;
  }

  const gasName = gasType.charAt(0).toUpperCase() + gasType.slice(1);
  
  return (
    <div className="bg-white rounded-lg p-6 shadow-lg border space-y-8">
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
        <h3 className="text-2xl font-bold text-gray-800">Comparison Results</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Absstem System Results */}
        <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500 shadow">
          <h4 className="text-lg font-semibold text-blue-800 mb-4">Absstem System</h4>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Available {gasName} Flow:</span>
              <span className="font-medium">{absstemData.nitrogenSupply} Nm³/hr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Compressor Power:</span>
              <span className="font-medium">{absstemData.compressorKW} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Utilization Factor:</span>
              <span className="font-medium">{absstemData.utilizationFactor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Input Power:</span>
              <span className="font-medium">{absstemData.totalInputPower.toFixed(2)} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Specific Power:</span>
              <span className="font-medium">{absstemData.specificPower.toFixed(2)} kW/Nm³</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-gray-800">Plant Cost:</span>
              <span>{formatCurrency(absstemData.plantCost)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-gray-800">Annual Power Cost:</span>
              <span>{formatCurrency(absstemData.annualPowerCost)}</span>
            </div>
            <div className="flex justify-between text-blue-800 font-bold pt-3 border-t border-blue-200">
              <span>10-Year Lifecycle Cost:</span>
              <span>{formatCurrency(absstemData.tenYearCost)}</span>
            </div>
          </div>
        </div>
        
        {/* Competition System Results */}
        <div className="bg-orange-50 rounded-lg p-6 border-l-4 border-orange-500 shadow">
          <h4 className="text-lg font-semibold text-orange-800 mb-4">Competition System</h4>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Available {gasName} Flow:</span>
              <span className="font-medium">{competitionData.flow} Nm³/hr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Compressor Power:</span>
              <span className="font-medium">{competitionData.compressorKW} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Utilization Factor:</span>
              <span className="font-medium">{competitionData.utilizationFactor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Input Power:</span>
              <span className="font-medium">{competitionData.totalInputPower.toFixed(2)} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Specific Power:</span>
              <span className="font-medium">{competitionData.specificPower.toFixed(2)} kW/Nm³</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-gray-800">Plant Cost:</span>
              <span>{formatCurrency(competitionData.plantCost)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-gray-800">Annual Power Cost:</span>
              <span>{formatCurrency(competitionData.annualPowerCost)}</span>
            </div>
            <div className="flex justify-between text-orange-800 font-bold pt-3 border-t border-orange-200">
              <span>10-Year Lifecycle Cost:</span>
              <span>{formatCurrency(competitionData.tenYearCost)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Savings and ROI Analysis */}
      <div className="bg-green-50 rounded-lg p-6 shadow border-l-4 border-green-500">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h4 className="text-lg font-semibold text-green-800">Savings Analysis</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-sm text-gray-600 mb-2">Annual Power Cost Savings</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(comparison.annualSavings)}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-sm text-gray-600 mb-2">Total 10-Year Lifecycle Savings</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(comparison.totalSavings)}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-sm text-gray-600 mb-2">Return on Investment</div>
            <div className="text-2xl font-bold text-blue-600">{comparison.roi > 0 ? `${comparison.roi.toFixed(1)} Years` : 'Immediate/N/A'}</div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="mt-8">
        <ComparisonCharts 
          yearlyData={comparison.yearlyData} 
          absstemPower={absstemData.totalInputPower} 
          competitionPower={competitionData.totalInputPower}
          absstemAnnualCost={absstemData.annualPowerCost}
          competitionAnnualCost={competitionData.annualPowerCost}
        />
      </div>
    </div>
  );
};

export default ComparisonResult;