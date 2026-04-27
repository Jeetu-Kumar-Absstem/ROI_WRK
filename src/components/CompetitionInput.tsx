import { useState } from 'react';
import { LOAD_FACTORS } from '../types/calculator';

interface CompetitionInputProps {
  gasType: 'nitrogen' | 'oxygen';
  onCompetitionDataUpdate: (data: {
    flow: number;
    compressorKW: number;
    plantCost: number;
    specificPower: number;
    utilizationFactor: number;
  }) => void;
  absstemPlantCost: number;
  onAbsstemPlantCostChange: (cost: number) => void;
}

const CompetitionInput: React.FC<CompetitionInputProps> = ({ gasType, onCompetitionDataUpdate, absstemPlantCost, onAbsstemPlantCostChange }) => {
  const [competitionData, setCompetitionData] = useState({
    flow: 293,
    compressorKW: 175,
    plantCost: 5000000,
    specificPower: 0.5,
    utilizationFactor: 1.0,
  });

  const gasName = gasType.charAt(0).toUpperCase() + gasType.slice(1);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    
    if (!isNaN(numValue)) {
      const updatedData = { ...competitionData, [name]: numValue };
      
      // Recalculate specific power when flow or compressor KW changes
      if (name === 'flow' || name === 'compressorKW') {
        const powerKW = name === 'compressorKW' ? numValue : competitionData.compressorKW;
        const flow = name === 'flow' ? numValue : competitionData.flow;
        const utilization = competitionData.utilizationFactor;
        
        if (flow > 0) {
          updatedData.specificPower = (powerKW * utilization) / flow;
        }
      }
      
      // Update utilization factor if it's that field that changed
      if (name === 'utilizationFactor') {
        const powerKW = competitionData.compressorKW;
        const flow = competitionData.flow;
        
        if (flow > 0) {
          updatedData.specificPower = (powerKW * numValue) / flow;
        }
      }
      
      setCompetitionData(updatedData);
      onCompetitionDataUpdate(updatedData);
    }
  };
  
  const handleAbsstemCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onAbsstemPlantCostChange(value);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-lg p-4 shadow-sm border border-blue-200 h-full">
        <h3 className="text-xl font-semibold text-blue-800 mb-4">Absstem System Data</h3>
        
        <div>
          <label htmlFor="absstemPlantCost" className="block text-sm font-medium text-gray-700 mb-1">
            Absstem Plant Cost (₹)
          </label>
          <input
            type="number"
            id="absstemPlantCost"
            name="absstemPlantCost"
            value={absstemPlantCost}
            onChange={handleAbsstemCostChange}
            min="1"
            className="input-field highlighted"
          />
        </div>
      </div>
      
      <div className="bg-orange-50 rounded-lg p-4 shadow-sm border border-orange-200 h-full">
        <h3 className="text-xl font-semibold text-orange-800 mb-4">Competition System Data</h3>
        
        <div className="space-y-4">
          <div><label htmlFor="competition-flow" className="block text-sm font-medium text-gray-700 mb-1">
            Available {gasName} Flow (Nm³/hr)
          </label>
          <input
            type="number"
            id="competition-flow"
            name="flow"
            value={competitionData.flow}
            onChange={handleChange}
            min="1"
            className="input-field highlighted"
          /></div>

          <div><label htmlFor="competition-compressorKW" className="block text-sm font-medium text-gray-700 mb-1">
            Compressor Power (kW)
          </label>
          <input
            type="number"
            id="competition-compressorKW"
            name="compressorKW"
            value={competitionData.compressorKW}
            onChange={handleChange}
            min="1"
            className="input-field highlighted"
          /></div>

          <div><label htmlFor="competition-utilizationFactor" className="block text-sm font-medium text-gray-700 mb-1">
            Utilization Factor
          </label>
          <select
            id="competition-utilizationFactor"
            name="utilizationFactor"
            value={competitionData.utilizationFactor}
            onChange={handleChange}
            className="input-field highlighted"
          >
            {LOAD_FACTORS.map(factor => (
              <option key={factor} value={factor}>{factor}</option>
            ))}
          </select></div>

          <div><label htmlFor="competition-plantCost" className="block text-sm font-medium text-gray-700 mb-1">
            Plant Cost (₹)
          </label>
          <input
            type="number"
            id="competition-plantCost"
            name="plantCost"
            value={competitionData.plantCost}
            onChange={handleChange}
            min="1"
            className="input-field highlighted"
          /></div>
        </div>
      </div>
    </div>
  );
};

export default CompetitionInput;