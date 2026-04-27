export interface OperationalParams {
  powerCostPerUnit: number;
  totalRunningHours: number;
  flowRequired: number;
}

export interface YearlyData {
  year: number;
  absstemCost: number;
  competitionCost: number;
  savings: number;
}

export interface GeneratorData {
  id: number;
  name: string;
  brand: string;
}

export interface FlowData {
    purity: number;
    flow: number;
    airRequirement: number;
}

export interface CompressorData {
    kw: number;
    airFlow: number;
}

export interface NitrogenModel {
    Model: string;
    Purity: string;
    Flow: string;
    AirRequirement: string;
    StorageVolume: string;
    AirVesselVolume: string;
}

export interface Compressor {
    kw: number;
    airFlow: number;
    CompressorModel?: string; // Optional model name
}