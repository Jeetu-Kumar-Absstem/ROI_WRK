import { useState, useEffect } from 'react';
import { FLOW_DATA, OXYGEN_FLOW_DATA, PURITIES, OXYGEN_PURITIES, COMPRESSOR_DATA, LOAD_FACTORS } from '../types/calculator.ts';
import { NitrogenModel, FlowData, CompressorData } from './types.ts';

interface ModelSelectorProps {
  gasType: 'nitrogen' | 'oxygen';
  onGasTypeChange: (gas: 'nitrogen' | 'oxygen') => void;
  onModelSelect: (model: NitrogenModel | null) => void;
  utilizationFactor: number;
  onUtilizationChange: (factor: number) => void;
  onCompressorSelect: (compressor: CompressorData | null) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ gasType, onGasTypeChange, onModelSelect, utilizationFactor, onUtilizationChange, onCompressorSelect }) => {
  const [selectedPurity, setSelectedPurity] = useState<string>('99.9');
  const [filteredModels, setFilteredModels] = useState<NitrogenModel[]>([]);
  const [selectedModelFlow, setSelectedModelFlow] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<NitrogenModel | null>(null);
  const [selectedCompressor, setSelectedCompressor] = useState<CompressorData | null>(null);
  
  // Filter models by selected purity
  useEffect(() => {
    const data = gasType === 'nitrogen' ? FLOW_DATA : OXYGEN_FLOW_DATA;
    const filtered: NitrogenModel[] = data
      .filter((model: FlowData) => String(model.purity) === selectedPurity)
      .map((model: FlowData): NitrogenModel => ({
        Model: `Model-${model.flow}`, // Creating a placeholder model name
        Purity: String(model.purity),
        Flow: String(model.flow),
        AirRequirement: String(model.airRequirement),
        StorageVolume: '0', // Placeholder
        AirVesselVolume: '0', // Placeholder
      }));
    setFilteredModels(filtered);
    setSelectedModelFlow('');
    setSelectedModel(null);
  }, [selectedPurity, gasType]);
  
  // When model is selected, find the model object and update parent
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const flow = e.target.value;
    setSelectedModelFlow(flow);
    
    const model = filteredModels.find(m => m.Flow === flow) || null;
    setSelectedModel(model);
    
    if (model) {
      onModelSelect(model);
      
      // Find appropriate compressor
      const airRequirement = parseFloat(model.AirRequirement);
      
      // Find all suitable compressors
      const suitableCompressors = COMPRESSOR_DATA.filter((comp: CompressorData) => {
        const airFlow = comp.airFlow;
        return airFlow >= airRequirement;
      }).sort((a: CompressorData, b: CompressorData) => {
        const airFlowA = a.airFlow;
        const airFlowB = b.airFlow;
        return airFlowA - airFlowB; // Sort by ascending airflow
      });
      
      if (suitableCompressors.length > 0) {
        setSelectedCompressor(suitableCompressors[0]);
        onCompressorSelect(suitableCompressors[0]);
      }
    } else {
      setSelectedCompressor(null);
    }
  };
  
  // When compressor selection changes
  const handleCompressorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const compressorModel = e.target.value;
    // Since COMPRESSOR_DATA doesn't have a model name, we'll find by KW
    const compressor = COMPRESSOR_DATA.find((c: CompressorData) => String(c.kw) === compressorModel) || null;
    
    if (compressor) {
      setSelectedCompressor(compressor);
      onCompressorSelect(compressor);
    }
  };

  const gasName = gasType.charAt(0).toUpperCase() + gasType.slice(1);

  return (
    <div className="bg-blue-50 rounded-lg p-4 shadow-sm border border-blue-200">
      <h3 className="text-xl font-semibold text-blue-800 mb-4">Absstem System Configuration</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="gas-type-select" className="block text-sm font-medium text-gray-700 mb-1">
            Gas Type
          </label>
          <select
            id="gas-type-select"
            value={gasType}
            onChange={(e) => {
              const newGasType = e.target.value as 'nitrogen' | 'oxygen';
              onGasTypeChange(newGasType);
              setSelectedPurity(newGasType === 'nitrogen' ? '99.9' : '95');
            }}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-green-50"
          >
            <option value="nitrogen">Nitrogen</option>
            <option value="oxygen">Oxygen</option>
          </select>
        </div>
        <div>
          <label htmlFor="purity-select" className="block text-sm font-medium text-gray-700 mb-1">
            Required {gasName} Purity
          </label>
          <select
            value={selectedPurity}
            id="purity-select"
            onChange={(e) => setSelectedPurity(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-green-50"
          >
            {(gasType === 'nitrogen' ? PURITIES : OXYGEN_PURITIES).map((p: number) => (
              <option key={p} value={p}>{p}%</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="flow-select" className="block text-sm font-medium text-gray-700 mb-1">
            Available {gasName} Flow (Nm³/hr)
          </label>
          <select
            value={selectedModelFlow}
            id="flow-select"
            onChange={handleModelChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-green-50"
            disabled={filteredModels.length === 0}
          >
            <option value="">Select Flow Rate</option>
            {filteredModels.map((model: NitrogenModel, index: number) => (
              <option key={index} value={model.Flow}>
                {model.Flow} Nm³/hr
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="absstem-utilization" className="block text-sm font-medium text-gray-700 mb-1">
            Utilization Factor
          </label>
          <select
            id="absstem-utilization"
            value={utilizationFactor}
            onChange={(e) => {
              const newUtil = parseFloat(e.target.value);
              onUtilizationChange(newUtil);
            }}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-green-50"
          >
            {LOAD_FACTORS.map(factor => (
              <option key={factor} value={factor}>{factor}</option>
            ))}
          </select>
        </div>
      </div>
      
      {selectedModel && (
        <div className="mt-4">
          <label htmlFor="compressor-select" className="block text-sm font-medium text-gray-700 mb-1">
            Compressor Selection
          </label>
          <select
            value={selectedCompressor?.kw || ''}
            id="compressor-select"
            onChange={handleCompressorChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-green-50"
          >
            {COMPRESSOR_DATA
              .filter((comp: CompressorData) => comp.airFlow >= parseFloat(selectedModel.AirRequirement))
              .sort((a: CompressorData, b: CompressorData) => a.airFlow - b.airFlow)
              .map((comp: CompressorData, index: number) => (
                <option key={index} value={comp.kw}>
                  {comp.kw} kW - {comp.airFlow} CFM
                </option>
              ))
            }
          </select>
        </div>
      )}
      
      {selectedModel && selectedCompressor && (
        <div className="mt-6 border-t border-blue-100 pt-4">
          <h4 className="font-medium text-blue-700 mb-3">Selected Model Specifications</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded shadow-sm">
              <p className="text-gray-500">Available {gasName} Flow:</p>
              <p className="font-medium">{selectedModel.Flow} Nm³/hr</p>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <p className="text-gray-500">Required Air Flow:</p>
              <p className="font-medium">{selectedModel.AirRequirement} CFM</p>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <p className="text-gray-500">Compressor Power:</p>
              <p className="font-medium">{selectedCompressor.kw} kW</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
