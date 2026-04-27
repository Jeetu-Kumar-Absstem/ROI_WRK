import { FlowData, CompressorData, FLOW_DATA, OXYGEN_FLOW_DATA, COMPRESSOR_DATA } from '../types/calculator';

export const findMatchingFlow = (
  requiredFlow: number,
  purity: number,
  gasType: 'nitrogen' | 'oxygen' = 'nitrogen'
): FlowData | null => {
  const flowData = gasType === 'oxygen' ? OXYGEN_FLOW_DATA : FLOW_DATA;
  const purityFlows = flowData.filter((data: FlowData) => data.purity === purity);

  if (purityFlows.length === 0) {
    return null;
  }

  const suitableFlows = purityFlows
    .filter((data: FlowData) => data.flow >= requiredFlow)
    .sort((a, b) => a.flow - b.flow);

  // Return the smallest suitable flow, or the largest available if no suitable one is found.
  return suitableFlows[0] || purityFlows.sort((a, b) => b.flow - a.flow)[0] || null;
};

export const findMatchingCompressor = (requiredAirFlow: number): CompressorData | null => {
  // The requiredAirFlow from findMatchingFlow is already in CFM, so no conversion is needed here.
  // COMPRESSOR_DATA.airFlow is also in CFM.
  const suitableCompressors = COMPRESSOR_DATA.filter(data => data.airFlow >= requiredAirFlow).sort((a,b) => a.airFlow - b.airFlow);
  return suitableCompressors[0] || null;
};