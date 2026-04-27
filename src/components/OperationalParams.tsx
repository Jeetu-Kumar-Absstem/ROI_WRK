import { OperationalParams } from './types';

interface OperationalParamsProps {
  params: OperationalParams;
  onParamChange: (params: OperationalParams) => void;
}

const OperationalParamsComponent: React.FC<OperationalParamsProps> = ({ params, onParamChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Convert string values to numbers
    const numValue = name === 'powerCostPerUnit' ? parseFloat(value) : parseInt(value, 10);
    
    if (!isNaN(numValue)) {
      onParamChange({
        ...params,
        [name]: numValue
      });
    }
  };
  
  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Operational Parameters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="flowRequired" className="block text-sm font-medium text-gray-700 mb-2">
            Required Flow (Nm³/hr)
          </label>
          <input
            type="number"
            id="flowRequired"
            name="flowRequired"
            value={params.flowRequired}
            onChange={handleChange}
            min="1"
            className="input-field highlighted"
          />
        </div>
        
        <div>
          <label htmlFor="powerCostPerUnit" className="block text-sm font-medium text-gray-700 mb-2">
            Power Cost (₹/kWh)
          </label>
          <input
            type="number"
            id="powerCostPerUnit"
            name="powerCostPerUnit"
            value={params.powerCostPerUnit}
            onChange={handleChange}
            min="0.1"
            step="0.1"
            className="input-field highlighted"
          />
        </div>
        
        <div>
          <label htmlFor="totalRunningHours" className="block text-sm font-medium text-gray-700 mb-2">
            Annual Operating Hours
          </label>
          <input
            type="number"
            id="totalRunningHours"
            name="totalRunningHours"
            value={params.totalRunningHours}
            onChange={handleChange}
            min="1"
            className="input-field highlighted"
          />
        </div>
      </div>
    </div>
  );
};

export default OperationalParamsComponent;