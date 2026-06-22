import { FlowData, CompressorData, FLOW_DATA, OXYGEN_FLOW_DATA, COMPRESSOR_DATA } from '../types/calculator';

export interface FlowMatchResult {
  // Single unit properties (from catalog)
  flow: number;
  airRequirement: number;
  purity: number;
  // Multi-unit properties
  units: number;          // number of identical PSA plants needed
  totalFlow: number;      // flow × units
  totalAirRequirement: number; // airRequirement × units
}

interface FlowMatchOptions {
  allowMultiUnit?: boolean;
  requireCompressorMatch?: boolean;
}

const toSingleUnitMatch = (flow: FlowData): FlowMatchResult => ({
  flow: flow.flow,
  airRequirement: flow.airRequirement,
  purity: flow.purity,
  units: 1,
  totalFlow: flow.flow,
  totalAirRequirement: flow.airRequirement,
});

export const findMatchingFlow = (
  requiredFlow: number,
  purity: number,
  gasType: 'nitrogen' | 'oxygen' = 'nitrogen',
  options: FlowMatchOptions = {}
): FlowMatchResult | null => {
  const flowData = gasType === 'oxygen' ? OXYGEN_FLOW_DATA : FLOW_DATA;
  const purityFlows = flowData.filter((data: FlowData) => data.purity === purity);

  if (purityFlows.length === 0) return null;

  const sourceFlows = options.requireCompressorMatch
    ? purityFlows.filter((data: FlowData) => data.airRequirement <= Math.max(...COMPRESSOR_DATA.map(c => c.airFlow)))
    : purityFlows;

  const validFlows = sourceFlows
    .sort((a, b) => a.flow - b.flow);

  if (validFlows.length === 0) return null;

  // Default behavior is intentionally single-plant matching. PSA vs Liquid depends on
  // this legacy path: smallest flow >= required, otherwise largest available plant.
  const singleMatch = validFlows.find(d => d.flow >= requiredFlow);
  if (singleMatch || !options.allowMultiUnit) {
    return toSingleUnitMatch(singleMatch || validFlows[validFlows.length - 1]);
  }

  // ── Multi-plant path: find plant size P that minimises N = ceil(required / P.flow)
  //    Tie-break: smallest overshoot (totalFlow - required) ──
  let best: FlowMatchResult | null = null;

  for (const plant of validFlows) {
    const n = Math.ceil(requiredFlow / plant.flow);
    const totalFlow = n * plant.flow;
    const overshoot = totalFlow - requiredFlow;

    if (
      best === null ||
      n < best.units ||
      (n === best.units && overshoot < (best.totalFlow - requiredFlow))
    ) {
      best = {
        flow: plant.flow,
        airRequirement: plant.airRequirement,
        purity: plant.purity,
        units: n,
        totalFlow,
        totalAirRequirement: plant.airRequirement * n,
      };
    }
  }

  return best;
};

export const findMatchingCompressor = (requiredAirFlow: number): CompressorData | null => {
  // The requiredAirFlow from findMatchingFlow is already in CFM, so no conversion is needed here.
  // COMPRESSOR_DATA.airFlow is also in CFM.
  const suitableCompressors = COMPRESSOR_DATA.filter(data => data.airFlow >= requiredAirFlow).sort((a,b) => a.airFlow - b.airFlow);
  return suitableCompressors[0] || null;
};
