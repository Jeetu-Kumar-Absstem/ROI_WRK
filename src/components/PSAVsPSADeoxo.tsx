import { useEffect, useRef, useState } from 'react';
import { Calculator } from 'lucide-react';
import { Line, LineChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis, BarChart, Bar, Cell, ResponsiveContainer } from 'recharts';
import DownloadPdfButton from './DownloadPdfButton';
import { ReportLayout } from './ReportLayout';
import { CompressorData, NitrogenModel, OperationalParams as OperationalParamsType } from './types';
import { COMPRESSOR_DATA, FLOW_DATA, LOAD_FACTORS, PURITIES } from '../types/calculator';
import { deoxoDataForAmmonia, deoxoDataForHydrogen, DeoxoDataItem } from '../data/deoxoData';
import { formatIndianCurrency, formatLoadFactor, formatNumber } from '../utils/formatting';
import { formatIndianNumber } from '../utils/formatters';
import {
  CalculatedDeoxoSystem,
  CalculatedPsaSystem,
  calculateDeoxoComparisonResults,
} from '../utils/deoxoCalculations';

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

interface SystemConfigurationCardProps {
  title: string;
  titleClassName: string;
  borderClassName: string;
  purity: string;
  flow: string;
  utilizationFactor: number;
  plantCost: number;
  selectedModel: NitrogenModel | null;
  selectedCompressor: CompressorData | null;
  flowOptions: NitrogenModel[];
  onPurityChange: (value: string) => void;
  onFlowChange: (value: string) => void;
  onUtilizationFactorChange: (value: number) => void;
  onCompressorChange: (value: string) => void;
  onPlantCostChange: (value: number) => void;
  chosenPsaAnnualPowerCost?: number | null;
  extraContent?: React.ReactNode;
}

function buildNitrogenModels(purity: string): NitrogenModel[] {
  return FLOW_DATA
    .filter((model) => String(model.purity) === purity)
    .map((model) => ({
      Model: `Model-${model.flow}`,
      Purity: String(model.purity),
      Flow: String(model.flow),
      AirRequirement: String(model.airRequirement),
      StorageVolume: '0',
      AirVesselVolume: '0',
    }));
}

const FIXED_PSA_PURITY = '99.999';
const FIXED_DEOXO_BASE_PURITY = '99.5';
const FIXED_DEOXO_FINAL_PURITY = '99.999';

function getSuitableCompressors(model: NitrogenModel | null): CompressorData[] {
  if (!model) {
    return [];
  }

  return COMPRESSOR_DATA
    .filter((compressor) => compressor.airFlow >= parseFloat(model.AirRequirement))
    .sort((left, right) => left.airFlow - right.airFlow);
}

function formatAxisINRMixed(value: number) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return Math.abs(value) >= 100000 ? `Ã¢â€šÂ¹${(value / 100000).toFixed(1)}L` : formatIndianCurrency(value);
}

function formatAxisINRFull(value: number) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return formatIndianNumber(value, 0);
}

function formatAxisLakhs(value: number) {
  if (!Number.isFinite(value)) {
    return '';
  }

  const lakhValue = value / 100000;
  return `₹${lakhValue.toFixed(1)}L`;
}

function MetricBox({
  label,
  value,
  valueClassName = 'text-xl leading-tight break-words',
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
      <div className="text-sm text-gray-500 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{label}</div>
      <div className={`${valueClassName} text-gray-900`} style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function CumulativeCostTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: { savings?: number } }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const pointData = payload[0]?.payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <div className="text-sm text-slate-500 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
        Year {label}
      </div>
      <div className="space-y-1 text-sm">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span style={{ color: entry.color, fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{entry.name}</span>
            <span className="text-slate-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
              {formatIndianCurrency(Number(entry.value ?? 0))}
            </span>
          </div>
        ))}
        <div className="mt-2 border-t border-slate-200 pt-2 flex items-center justify-between gap-4">
          <span className="text-emerald-700" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
            Cumulative Savings
          </span>
          <span className="text-emerald-700" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
            {formatIndianCurrency(Number(pointData?.savings ?? 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

function SystemCostCard({
  title,
  accentClassName,
  titleClassName,
  rows,
  footerLabel,
  footerValue,
  compact = false,
}: {
  title: string;
  accentClassName: string;
  titleClassName: string;
  rows: { label: string; value: React.ReactNode }[];
  footerLabel: string;
  footerValue: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${compact ? 'p-5' : 'p-6'} ${accentClassName}`}>
      <h3 className={`${compact ? 'text-xl mb-4' : 'text-2xl mb-5'} ${titleClassName}`} style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>{title}</h3>
      <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4">
            <span className={`text-gray-600 ${compact ? 'text-sm' : ''}`} style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{row.label}</span>
            <span className={`text-right text-gray-900 ${compact ? 'text-sm' : ''}`} style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{row.value}</span>
          </div>
        ))}
      </div>
      <div className={`${compact ? 'mt-4 pt-3' : 'mt-5 pt-4'} border-t border-slate-200 flex items-start justify-between gap-4`}>
        <span className={`${compact ? 'text-base' : 'text-lg'} ${titleClassName}`} style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>{footerLabel}</span>
        <span className={`${compact ? 'text-xl' : 'text-2xl'} ${titleClassName}`} style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>{footerValue}</span>
      </div>
    </div>
  );
}

function SystemConfigurationCard({
  title,
  titleClassName,
  borderClassName,
  purity,
  flow,
  utilizationFactor,
  plantCost,
  selectedModel,
  selectedCompressor,
  flowOptions,
  onPurityChange,
  onFlowChange,
  onUtilizationFactorChange,
  onCompressorChange,
  onPlantCostChange,
  chosenPsaAnnualPowerCost,
  extraContent,
}: SystemConfigurationCardProps) {
  const availableCompressors = getSuitableCompressors(selectedModel);

  return (
    <div className={`rounded-2xl border p-5 shadow-sm bg-slate-50 ${borderClassName}`}>
      <h2 className={`text-2xl mb-5 ${titleClassName}`} style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
            Gas Type
          </label>
          <select value="nitrogen" disabled className="w-full rounded-xl border border-slate-200 bg-green-50 px-4 py-3 text-gray-900">
            <option value="nitrogen">Nitrogen</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
            Required Nitrogen Purity
          </label>
          <select
            value={purity}
            onChange={(event) => onPurityChange(event.target.value)}
            disabled={title === 'Absstem PSA System Configuration' || title === 'Absstem PSA + Deoxo Configuration'}
            className="w-full rounded-xl border border-slate-200 bg-green-50 px-4 py-3 text-gray-900"
          >
            {(title === 'Absstem PSA System Configuration'
              ? [Number(FIXED_PSA_PURITY)]
              : title === 'Absstem PSA + Deoxo Configuration'
                ? [Number(FIXED_DEOXO_BASE_PURITY)]
                : PURITIES
            ).map((item) => (
              <option key={item} value={item}>
                {item}%
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
            Available Nitrogen Flow (Nm<sup>3</sup>/hr)
          </label>
          <select
            value={flow}
            onChange={(event) => onFlowChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-green-50 px-4 py-3 text-gray-900"
          >
            <option value="">Select Flow Rate</option>
            {flowOptions.map((item) => (
              <option key={`${item.Purity}-${item.Flow}`} value={item.Flow}>
                {item.Flow} Nm³/hr
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
            Utilization Factor
          </label>
          <select
            value={utilizationFactor}
            onChange={(event) => onUtilizationFactorChange(parseFloat(event.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-green-50 px-4 py-3 text-gray-900"
          >
            {LOAD_FACTORS.map((item) => (
              <option key={item} value={item}>
                {formatLoadFactor(item)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedModel && (
        <div className="mt-4">
          <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
            Compressor Selection
          </label>
          <select
            value={selectedCompressor ? `${selectedCompressor.kw}-${selectedCompressor.airFlow}` : ''}
            onChange={(event) => onCompressorChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-green-50 px-4 py-3 text-gray-900"
          >
            {availableCompressors.map((compressor) => (
              <option key={`${compressor.kw}-${compressor.airFlow}`} value={`${compressor.kw}-${compressor.airFlow}`}>
                {compressor.kw} kW - {compressor.airFlow} CFM
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedModel && selectedCompressor && title === 'Absstem PSA + Deoxo Configuration' && (
        <div className="mt-6 border-t border-slate-200 pt-5">
          <h3 className={`text-xl mb-3 ${titleClassName}`} style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Selected PSA Model Specifications</h3>
          <div className={`grid grid-cols-1 ${chosenPsaAnnualPowerCost !== undefined && chosenPsaAnnualPowerCost !== null ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3`}>
            <MetricBox label={<>Available Nitrogen Flow</>} value={<>{selectedModel.Flow} Nm³/hr</>} />
            <MetricBox label={<>Required Air Flow</>} value={<>{selectedModel.AirRequirement} CFM</>} />
            <MetricBox label={<>Compressor Power</>} value={<>{selectedCompressor.kw} kW</>} />
            {chosenPsaAnnualPowerCost !== undefined && chosenPsaAnnualPowerCost !== null && (
              <MetricBox
                label={<>Annual Power Cost</>}
                value={<>{formatIndianCurrency(chosenPsaAnnualPowerCost)}</>}
                valueClassName="text-lg leading-tight break-words"
              />
            )}
          </div>
        </div>
      )}

      {extraContent}

      <div className="mt-5 border-t border-slate-200 pt-5">
        <h3 className={`text-xl mb-3 ${titleClassName}`} style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>System Data</h3>
        <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
          Plant Cost (₹)
        </label>
        <input
          type="number"
          min="1"
          value={plantCost}
          onChange={(event) => onPlantCostChange(Math.max(1, Number(event.target.value) || 1))}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>

      {selectedModel && selectedCompressor && title !== 'Absstem PSA + Deoxo Configuration' && (
        <div className="mt-6 border-t border-slate-200 pt-5">
          <h3 className={`text-xl mb-3 ${titleClassName}`} style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Selected PSA Model Specifications</h3>
          <div className={`grid grid-cols-1 ${chosenPsaAnnualPowerCost !== undefined && chosenPsaAnnualPowerCost !== null ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3`}>
            <MetricBox label={<>Available Nitrogen Flow</>} value={<>{selectedModel.Flow} Nm³/hr</>} />
            <MetricBox label={<>Required Air Flow</>} value={<>{selectedModel.AirRequirement} CFM</>} />
            <MetricBox label={<>Compressor Power</>} value={<>{selectedCompressor.kw} kW</>} />
            {chosenPsaAnnualPowerCost !== undefined && chosenPsaAnnualPowerCost !== null && (
              <MetricBox
                label={<>Annual Power Cost</>}
                value={<>{formatIndianCurrency(chosenPsaAnnualPowerCost)}</>}
                valueClassName="text-lg leading-tight break-words"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PSAVsPSADeoxo() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [operationalParams, setOperationalParams] = useState<OperationalParamsType>({
    powerCostPerUnit: 9,
    totalRunningHours: 8000,
    flowRequired: 300,
  });

  const [psaPurity, setPsaPurity] = useState(FIXED_PSA_PURITY);
  const [psaFlow, setPsaFlow] = useState('');
  const [psaModel, setPsaModel] = useState<NitrogenModel | null>(null);
  const [psaCompressor, setPsaCompressor] = useState<CompressorData | null>(null);
  const [psaUtilizationFactor, setPsaUtilizationFactor] = useState(0.9);
  const [psaPlantCost, setPsaPlantCost] = useState(5000000);

  const [deoxoPurity, setDeoxoPurity] = useState(FIXED_DEOXO_BASE_PURITY);
  const [deoxoDataPurity, setDeoxoDataPurity] = useState(FIXED_DEOXO_FINAL_PURITY);
  const [deoxoPsaFlow, setDeoxoPsaFlow] = useState('');
  const [deoxoModel, setDeoxoModel] = useState<NitrogenModel | null>(null);
  const [deoxoCompressor, setDeoxoCompressor] = useState<CompressorData | null>(null);
  const [deoxoUtilizationFactor, setDeoxoUtilizationFactor] = useState(0.9);
  const [deoxoPlantCost, setDeoxoPlantCost] = useState(5000000);
  const [reagentType, setReagentType] = useState<'hydrogen' | 'ammonia'>('hydrogen');
  const [reagentCostPerKg, setReagentCostPerKg] = useState(100);
  const [waterCostPerM3, setWaterCostPerM3] = useState(2);
  const [selectedDeoxoFlow, setSelectedDeoxoFlow] = useState('');

  const [results, setResults] = useState<{
    psa: CalculatedPsaSystem;
    deoxo: CalculatedDeoxoSystem;
    comparison: {
      annualSavings: number;
      totalSavings: number;
      roiYears: number | null;
      yearlyData: OperationalParamsType extends never ? never : { year: number; absstemCost: number; competitionCost: number; savings: number }[];
    };
  } | null>(null);

  const psaFlowOptions = buildNitrogenModels(psaPurity);
  const deoxoFlowOptions = buildNitrogenModels(deoxoPurity);
  const deoxoDataOptions = reagentType === 'hydrogen' ? deoxoDataForHydrogen : deoxoDataForAmmonia;
  const deoxoPurityOptions = [Number(FIXED_DEOXO_FINAL_PURITY)];

  useEffect(() => {
    if (psaPurity !== FIXED_PSA_PURITY) {
      setPsaPurity(FIXED_PSA_PURITY);
    }
  }, [psaPurity]);

  useEffect(() => {
    if (deoxoPurity !== FIXED_DEOXO_BASE_PURITY) {
      setDeoxoPurity(FIXED_DEOXO_BASE_PURITY);
    }
  }, [deoxoPurity]);

  useEffect(() => {
    if (deoxoDataPurity !== FIXED_DEOXO_FINAL_PURITY) {
      setDeoxoDataPurity(FIXED_DEOXO_FINAL_PURITY);
    }
  }, [deoxoDataPurity]);

  useEffect(() => {
    setPsaFlow('');
    setPsaModel(null);
    setPsaCompressor(null);
  }, [psaPurity]);

  useEffect(() => {
    setDeoxoPsaFlow('');
    setDeoxoModel(null);
    setDeoxoCompressor(null);
    setSelectedDeoxoFlow('');
  }, [deoxoPurity]);

  useEffect(() => {
    const currentPurityValue = Number(deoxoDataPurity);
    const allowedPurities = PURITIES.filter((item) => item > Number(deoxoPurity));

    if (allowedPurities.length === 0) {
      setDeoxoDataPurity(deoxoPurity);
      return;
    }

    if (!allowedPurities.includes(currentPurityValue)) {
      setDeoxoDataPurity(String(allowedPurities[0]));
    }
  }, [deoxoPurity, deoxoDataPurity]);

  useEffect(() => {
    if (reagentType === 'hydrogen') {
      setReagentCostPerKg(100);
    } else {
      setReagentCostPerKg(60);
    }
  }, [reagentType]);

  useEffect(() => {
    if (!selectedDeoxoFlow) {
      return;
    }

    const exists = deoxoDataOptions.some((item) => String(item.flow) === selectedDeoxoFlow);
    if (!exists) {
      setSelectedDeoxoFlow('');
    }
  }, [deoxoDataOptions, selectedDeoxoFlow]);

  useEffect(() => {
    if (!(psaModel && psaCompressor && deoxoModel && deoxoCompressor && selectedDeoxoFlow)) {
      setResults(null);
      return;
    }

    const deoxoDataset = reagentType === 'hydrogen' ? deoxoDataForHydrogen : deoxoDataForAmmonia;
    const deoxoSelection = deoxoDataset.find((item) => String(item.flow) === selectedDeoxoFlow);

    if (!deoxoSelection) {
      setResults(null);
      return;
    }

    setResults(
      calculateDeoxoComparisonResults(
        {
          model: psaModel,
          compressor: psaCompressor,
          utilizationFactor: psaUtilizationFactor,
          plantCost: psaPlantCost,
        },
        {
          model: deoxoModel,
          compressor: deoxoCompressor,
          utilizationFactor: deoxoUtilizationFactor,
          plantCost: deoxoPlantCost,
          requiredPurity: deoxoDataPurity,
          reagentType,
          reagentCostPerKg,
          waterCostPerM3,
          deoxoData: deoxoSelection,
        },
        operationalParams
      )
    );
  }, [
    psaModel,
    psaCompressor,
    psaUtilizationFactor,
    psaPlantCost,
    deoxoModel,
    deoxoCompressor,
    deoxoUtilizationFactor,
    deoxoPlantCost,
    deoxoDataPurity,
    reagentType,
    reagentCostPerKg,
    waterCostPerM3,
    selectedDeoxoFlow,
    operationalParams,
  ]);

  const handlePsaFlowChange = (value: string) => {
    setPsaFlow(value);
    const model = psaFlowOptions.find((item) => item.Flow === value) ?? null;
    setPsaModel(model);
    const compressors = getSuitableCompressors(model);
    setPsaCompressor(compressors[0] ?? null);
  };

  const handleDeoxoPsaFlowChange = (value: string) => {
    setDeoxoPsaFlow(value);
    const model = deoxoFlowOptions.find((item) => item.Flow === value) ?? null;
    setDeoxoModel(model);
    const compressors = getSuitableCompressors(model);
    setDeoxoCompressor(compressors[0] ?? null);
    setSelectedDeoxoFlow('');
  };

  const handleCompressorSelection = (
    value: string,
    selectedModelValue: NitrogenModel | null,
    setter: (compressor: CompressorData | null) => void
  ) => {
    const [kw, airFlow] = value.split('-').map(Number);
    const compressor = getSuitableCompressors(selectedModelValue).find(
      (item) => item.kw === kw && item.airFlow === airFlow
    ) ?? null;
    setter(compressor);
  };

  const renderOperationalCard = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <Calculator className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Input Parameters</h2>
      </div>
      <div className="rounded-2xl bg-slate-50 p-5">
        <h3 className="text-xl text-gray-900 mb-4" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Operational Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
              Required Flow (Nm<sup>3</sup>/hr)
            </label>
            <input
              type="number"
              min="1"
              value={operationalParams.flowRequired}
              onChange={(event) => setOperationalParams((current) => ({ ...current, flowRequired: Math.max(1, Number(event.target.value) || 1) }))}
              className="w-full h-14 rounded-xl border border-slate-200 bg-white px-4 py-3 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
              Power Cost (₹/kWh)
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={operationalParams.powerCostPerUnit}
              onChange={(event) => setOperationalParams((current) => ({ ...current, powerCostPerUnit: Math.max(0.1, Number(event.target.value) || 0.1) }))}
              className="w-full h-14 rounded-xl border border-slate-200 bg-white px-4 py-3 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
              Annual Operating Hours
            </label>
            <input
              type="number"
              min="1"
              value={operationalParams.totalRunningHours}
              onChange={(event) => setOperationalParams((current) => ({ ...current, totalRunningHours: Math.max(1, Number(event.target.value) || 1) }))}
              className="w-full h-14 rounded-xl border border-slate-200 bg-white px-4 py-3 text-gray-900"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const screenContent = (
    <main className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          {renderOperationalCard}
        <SystemConfigurationCard
          title="Absstem PSA System Configuration"
          titleClassName="text-blue-800"
          borderClassName="border-blue-200"
          purity={psaPurity}
          flow={psaFlow}
          utilizationFactor={psaUtilizationFactor}
          plantCost={psaPlantCost}
          selectedModel={psaModel}
          selectedCompressor={psaCompressor}
          flowOptions={psaFlowOptions}
          onPurityChange={setPsaPurity}
          onFlowChange={handlePsaFlowChange}
          onUtilizationFactorChange={setPsaUtilizationFactor}
          onCompressorChange={(value) => handleCompressorSelection(value, psaModel, setPsaCompressor)}
          onPlantCostChange={setPsaPlantCost}
          chosenPsaAnnualPowerCost={results?.psa.annualPowerCost ?? null}
        />
        </div>
        <SystemConfigurationCard
          title="Absstem PSA + Deoxo Configuration"
          titleClassName="text-emerald-800"
          borderClassName="border-emerald-200"
          purity={deoxoPurity}
          flow={deoxoPsaFlow}
          utilizationFactor={deoxoUtilizationFactor}
          plantCost={deoxoPlantCost}
          selectedModel={deoxoModel}
          selectedCompressor={deoxoCompressor}
          flowOptions={deoxoFlowOptions}
          onPurityChange={setDeoxoPurity}
          onFlowChange={handleDeoxoPsaFlowChange}
          onUtilizationFactorChange={setDeoxoUtilizationFactor}
          onCompressorChange={(value) => handleCompressorSelection(value, deoxoModel, setDeoxoCompressor)}
          onPlantCostChange={setDeoxoPlantCost}
          chosenPsaAnnualPowerCost={results?.deoxo.annualPowerCost ?? null}
          extraContent={
            <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
              <h3 className="text-xl text-emerald-800" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
                Deoxo Data
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
                    Required  Nitrogen Purity
                  </label>
                  <select
                    value={deoxoDataPurity}
                    onChange={(event) => setDeoxoDataPurity(event.target.value)}
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-green-50 px-4 py-3 text-gray-900"
                  >
                    {deoxoPurityOptions.map((item) => (
                      <option key={`deoxo-purity-${item}`} value={item}>
                        {item}%
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
                    Hydrogen / Ammonia
                  </label>
                  <select
                    value={reagentType}
                    onChange={(event) => setReagentType(event.target.value as 'hydrogen' | 'ammonia')}
                    className="w-full rounded-xl border border-slate-200 bg-green-50 px-4 py-3 text-gray-900"
                  >
                    <option value="hydrogen">Hydrogen</option>
                    <option value="ammonia">Ammonia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
                    {reagentType === 'hydrogen' ? 'Hydrogen Cost (₹/m³)' : 'Ammonia Cost (₹/kg)'}
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={reagentCostPerKg}
                    onChange={(event) => setReagentCostPerKg(Math.max(0.01, Number(event.target.value) || 0.01))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
                    Water Cost (₹/m<sup>3</sup>)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={waterCostPerM3}
                    onChange={(event) => setWaterCostPerM3(Math.max(0.01, Number(event.target.value) || 0.01))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
                    Deoxo Flow (Nm<sup>3</sup>/hr)
                  </label>
                  <select
                    value={selectedDeoxoFlow}
                    onChange={(event) => setSelectedDeoxoFlow(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-green-50 px-4 py-3 text-gray-900"
                  >
                    <option value="">Select Flow Rate</option>
                    {deoxoDataOptions.map((item) => (
                      <option key={`${reagentType}-${item.flow}`} value={item.flow}>
                        {item.flow} Nm³/hr
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedDeoxoFlow && (
                <div className={`grid grid-cols-1 ${reagentType === 'ammonia' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3`}>
                  {(() => {
                    const selectedData = (reagentType === 'hydrogen' ? deoxoDataForHydrogen : deoxoDataForAmmonia).find(
                      (item) => String(item.flow) === selectedDeoxoFlow
                    ) as DeoxoDataItem | undefined;

                    if (!selectedData) {
                      return null;
                    }

                    return (
                      <>
                        <MetricBox
                          label={reagentType === 'hydrogen' ? 'Hydrogen Consumption' : 'Ammonia Consumption'}
                          value={
                            <>
                              {formatNumber(
                                reagentType === 'hydrogen'
                                  ? selectedData.hydrogenConsumptionKgHr ?? 0
                                  : selectedData.ammoniaConsumptionKgHr ?? 0,
                                2
                              )} {reagentType === 'hydrogen' ? 'm³/hr' : 'kg/hr'}
                            </>
                          }
                        />
                        <MetricBox label={<>Cooling Water Flow</>} value={<>{formatNumber(selectedData.coolingWaterFlow, 2)} m³/hr</>} />
                        <MetricBox label={<>Dryer Heater Power</>} value={<>{formatNumber(selectedData.dryerHeaterPower, 2)} kW</>} />
                        {reagentType === 'ammonia' && (
                          <MetricBox label={<>Ammonia Cracker Power</>} value={<>{formatNumber(selectedData.ammoniaCrackerPower ?? 0, 2)} kW</>} />
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          }
        />
      </div>

      {results && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemCostCard
              title="Absstem PSA System"
              accentClassName="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50"
              titleClassName="text-blue-800"
              rows={[
                { label: 'Available Nitrogen Flow', value: `${formatNumber(results.psa.nitrogenSupply)} Nm³/hr` },
                { label: 'Compressor Power', value: `${formatNumber(results.psa.compressorKW)} kW` },
                { label: 'Utilization Factor', value: formatLoadFactor(results.psa.utilizationFactor) },
                { label: 'Total Input Power', value: `${formatNumber(results.psa.totalInputPower)} kW` },
                { label: 'Specific Power', value: `${formatNumber(results.psa.specificPower, 3)} kW/Nm³` },
                { label: 'Plant Cost', value: formatIndianCurrency(results.psa.plantCost) },
                { label: 'Annual Power Cost', value: formatIndianCurrency(results.psa.annualPowerCost) },
              ]}
              footerLabel="10-Year Lifecycle Cost"
              footerValue={formatIndianCurrency(results.psa.tenYearCost)}
            />
            <SystemCostCard
              title="Absstem PSA + Deoxo"
              accentClassName="border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50"
              titleClassName="text-emerald-800"
              rows={[
                { label: 'Required Purity', value: `${results.deoxo.requiredPurity}%` },
                { label: 'Selected Flow', value: `${formatNumber(results.deoxo.deoxoFlow)} Nm³/hr` },
                { label: 'Reagent Type', value: results.deoxo.reagentType === 'hydrogen' ? 'Hydrogen' : 'Ammonia' },
                { label: 'Reagent Consumption', value: `${formatNumber(results.deoxo.consumptionKgHr, 2)} ${results.deoxo.reagentType === 'hydrogen' ? 'm³/hr' : 'kg/hr'}` },
                { label: 'Cooling Water Flow', value: `${formatNumber(results.deoxo.coolingWaterFlow, 2)} m³/hr` },
                ...(results.deoxo.reagentType === 'ammonia'
                  ? [{ label: 'Ammonia Cracker Power', value: `${formatNumber(results.deoxo.ammoniaCrackerPower ?? 0, 2)} kW` }]
                  : []),
                { label: 'Total Input Power', value: `${formatNumber(results.deoxo.totalInputPower)} kW` },
                { label: 'Specific Power', value: `${formatNumber(results.deoxo.specificPower, 3)} kW/Nm³` },
                { label: 'Plant Cost', value: formatIndianCurrency(results.deoxo.plantCost) },
                { label: 'PSA Annual Power Cost', value: formatIndianCurrency(results.deoxo.annualPowerCost) },
                { label: 'Deoxo Annual Utility Cost', value: formatIndianCurrency(results.deoxo.annualConsumableCost) },
              ]}
              footerLabel="10-Year Lifecycle Cost"
              footerValue={formatIndianCurrency(results.deoxo.tenYearCost)}
            />
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-lime-50 p-6 shadow-sm">
            <h3 className="text-2xl text-emerald-800 mb-5" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Savings Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricBox label="Annual Operating Cost Savings" value={formatIndianCurrency(results.comparison.annualSavings)} />
              <MetricBox label="Total 10-Year Lifecycle Savings" value={formatIndianCurrency(results.comparison.totalSavings)} />
              <MetricBox
                label="Return on Investment"
                value="Immediate N/A"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-2xl text-gray-900 mb-5" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
                10-Year Cumulative Cost Projection
              </h3>
              <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.comparison.yearlyData} margin={{ top: 10, right: 20, left: 10, bottom: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
                    <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                    <YAxis tickFormatter={(value) => formatAxisLakhs(Number(value))} width={58} />
                    <Tooltip content={<CumulativeCostTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="absstemCost" name="Absstem PSA" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="competitionCost" name="Absstem PSA + Deoxo" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-2xl text-gray-900 mb-5" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
                Total Input Power Comparison (kW)
              </h3>
              <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Absstem PSA', value: results.psa.totalInputPower },
                      { name: 'Absstem PSA + Deoxo', value: results.deoxo.totalInputPower },
                    ]}
                    margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
                    <XAxis dataKey="name" angle={0} interval={0} tickMargin={12} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${formatNumber(value)} kW`} />
                    <Legend />
                    <Bar dataKey="value" name="Input Power" radius={[12, 12, 0, 0]} isAnimationActive={false}>
                      <Cell fill="#10b981" />
                      <Cell fill="#2563eb" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </>
      )}
    </main>
  );

  const reportSummary = (
    <p className="text-justify">
      This report compares a standalone Absstem PSA system against an Absstem PSA system integrated with a Deoxo package.
      The analysis combines PSA power consumption, Deoxo auxiliary power, reagent usage, cooling-water cost, and plant cost
      to project annual operating cost and 10-year lifecycle cost, with graphical comparisons for cumulative cost projection
      and total input power.
    </p>
  );

  const reportInputParameters = (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-gray-900 mb-4" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Input Parameters</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
          <div className="text-gray-500 mb-2">Required Flow (Nm<sup>3</sup>/hr)</div>
          <div className="text-lg text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
            {formatNumber(operationalParams.flowRequired, 0)}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
          <div className="text-gray-500 mb-2">Power Cost (Rs/kWh)</div>
          <div className="text-lg text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
            {formatNumber(operationalParams.powerCostPerUnit, 2)}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
          <div className="text-gray-500 mb-2">Annual Operating Hours</div>
          <div className="text-lg text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
            {formatNumber(operationalParams.totalRunningHours, 0)}
          </div>
        </div>
      </div>
    </div>
  );

  const reportPageOneCards = results && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SystemCostCard
        title="Absstem PSA System"
        accentClassName="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50"
        titleClassName="text-blue-800"
        compact
        rows={[
          { label: 'Available Nitrogen Flow', value: <>{formatNumber(results.psa.nitrogenSupply)} Nm<sup>3</sup>/hr</> },
          { label: 'Compressor Power', value: `${formatNumber(results.psa.compressorKW)} kW` },
          { label: 'Utilization Factor', value: formatLoadFactor(results.psa.utilizationFactor) },
          { label: 'Total Input Power', value: `${formatNumber(results.psa.totalInputPower)} kW` },
          { label: 'Specific Power', value: <>{formatNumber(results.psa.specificPower, 3)} kW/Nm<sup>3</sup></> },
          { label: 'Plant Cost', value: formatIndianCurrency(results.psa.plantCost) },
          { label: 'Annual Power Cost', value: formatIndianCurrency(results.psa.annualPowerCost) },
        ]}
        footerLabel="10-Year Lifecycle Cost"
        footerValue={formatIndianCurrency(results.psa.tenYearCost)}
      />
      <SystemCostCard
        title="Absstem PSA + Deoxo"
        accentClassName="border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50"
        titleClassName="text-emerald-800"
        compact
        rows={[
          { label: 'Required Purity', value: `${results.deoxo.requiredPurity}%` },
          { label: 'Selected Flow', value: <>{formatNumber(results.deoxo.deoxoFlow)} Nm<sup>3</sup>/hr</> },
          { label: 'Reagent Type', value: results.deoxo.reagentType === 'hydrogen' ? 'Hydrogen' : 'Ammonia' },
          { label: 'Reagent Consumption', value: results.deoxo.reagentType === 'hydrogen' ? <>{formatNumber(results.deoxo.consumptionKgHr, 2)} Nm<sup>3</sup>/hr</> : `${formatNumber(results.deoxo.consumptionKgHr, 2)} kg/hr` },
          { label: 'Cooling Water Flow', value: <>{formatNumber(results.deoxo.coolingWaterFlow, 2)} m<sup>3</sup>/hr</> },
          ...(results.deoxo.reagentType === 'ammonia'
            ? [{ label: 'Ammonia Cracker Power', value: `${formatNumber(results.deoxo.ammoniaCrackerPower ?? 0, 2)} kW` }]
            : []),
          { label: 'Total Input Power', value: `${formatNumber(results.deoxo.totalInputPower)} kW` },
          { label: 'Specific Power', value: <>{formatNumber(results.deoxo.specificPower, 3)} kW/Nm<sup>3</sup></> },
          { label: 'Plant Cost', value: formatIndianCurrency(results.deoxo.plantCost) },
          { label: 'PSA Annual Power Cost', value: formatIndianCurrency(results.deoxo.annualPowerCost) },
          { label: 'Deoxo Annual Utility Cost', value: formatIndianCurrency(results.deoxo.annualConsumableCost) },
        ]}
        footerLabel="10-Year Lifecycle Cost"
        footerValue={formatIndianCurrency(results.deoxo.tenYearCost)}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
      <style>{lufgaFontStyle}</style>
      <div className="flex justify-end pb-6 print:hidden">
        <DownloadPdfButton
          contentToPrint={reportRef}
          tabName="PSA_Vs_PSA_DEOXO"
          inputs={{
            operationalParams,
            psa: {
              purity: psaPurity,
              flow: psaFlow,
              utilizationFactor: psaUtilizationFactor,
              plantCost: psaPlantCost,
              model: psaModel,
              compressor: psaCompressor,
            },
            deoxo: {
              purity: deoxoPurity,
              deoxoDataPurity,
              flow: deoxoPsaFlow,
              utilizationFactor: deoxoUtilizationFactor,
              plantCost: deoxoPlantCost,
              model: deoxoModel,
              compressor: deoxoCompressor,
              reagentType,
              reagentCostPerKg,
              waterCostPerM3,
              selectedDeoxoFlow,
            },
          }}
        />
      </div>

      <div className="print:hidden">{screenContent}</div>

      <ReportLayout
        ref={reportRef}
        title="Absstem PSA vs PSA + Deoxo Lifecycle Analysis"
        summary={reportSummary}
        pageOneContent={
          <>
            {reportInputParameters}
            <div className="mt-6">
              {reportPageOneCards}
            </div>
          </>
        }
      >

        <div className="print-page space-y-6">
          {results && (
            <>
              <div className="avoid-break bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 p-6 rounded-r-lg">
                <h2 className="text-2xl text-gray-800 mb-4 flex items-center" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>2</span>
                  </div>
                  Savings Analysis
                </h2>
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div className="bg-white p-4 rounded-lg border border-green-200 shadow-sm">
                    <div className="text-3xl text-green-600 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
                      {formatIndianCurrency(results.comparison.annualSavings)}
                    </div>
                    <div className="text-sm text-green-800">Annual Operating Cost Savings</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                    <div className="text-3xl text-blue-600 mb-2" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
                      {formatIndianCurrency(results.comparison.totalSavings)}
                    </div>
                    <div className="text-sm text-blue-800">Total 10-Year Lifecycle Savings</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-violet-200 shadow-sm flex flex-col justify-center min-h-[132px]">
                    <div className="text-3xl text-violet-600 mb-2 leading-tight break-words" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
                      Immediate/N/A
                    </div>
                    <div className="text-sm text-violet-800">Return on Investment</div>
                    <div className="text-sm text-violet-800">(Payback)</div>
                  </div>
                </div>
              </div>

              <div className="avoid-break rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xl text-gray-900 mb-4" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
                  10-Year Cumulative Cost Projection
                </h3>
                <div className="h-[310px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={results.comparison.yearlyData} margin={{ top: 10, right: 12, left: 28, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => formatAxisLakhs(Number(value))} width={58} />
                      <Tooltip content={<CumulativeCostTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="absstemCost" name="Absstem PSA" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                      <Line type="monotone" dataKey="competitionCost" name="Absstem PSA + Deoxo" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="avoid-break grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-lg text-gray-900 mb-3" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
                    Total Input Power Comparison (kW)
                  </h3>
                  <div className="h-[255px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Absstem PSA', value: results.psa.totalInputPower },
                          { name: 'Absstem PSA + Deoxo', value: results.deoxo.totalInputPower },
                        ]}
                        margin={{ top: 10, right: 10, left: 0, bottom: 34 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tickMargin={10} interval={0} />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatNumber(value) + ' kW'} />
                        <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 18 }} />
                        <Bar dataKey="value" name="Input Power" radius={[10, 10, 0, 0]} isAnimationActive={false}>
                          <Cell fill="#2563eb" />
                          <Cell fill="#10b981" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="print-page space-y-8">
          {results && (
            <>
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
                      This comparison shows the lifecycle impact of upgrading from a standalone Absstem PSA system to an Absstem PSA system with Deoxo.
                      The projected annual operating-cost difference is
                      <span className="font-semibold text-green-700"> {formatIndianCurrency(results.comparison.annualSavings)}</span>,
                      with a 10-year cumulative savings impact of
                      <span className="font-semibold text-green-700"> {formatIndianCurrency(results.comparison.totalSavings)}</span>.
                    </p>
                    <p>
                      Beyond direct operating cost, the Deoxo-integrated option changes the total input power requirement to
                      <span className="font-semibold text-blue-700"> {formatNumber(results.deoxo.totalInputPower)} kW</span>
                      and adds reagent plus utility costs that should be weighed against purity requirements and downstream process needs.
                    </p>
                    <p style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
                      Recommendation: Use the standalone Absstem PSA system when the required purity can be met without Deoxo. Choose PSA + Deoxo when the higher final purity justifies the additional lifecycle cost and utility consumption.
                    </p>
                  </div>
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
                        <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>PSA+Deoxo Cost</th>
                        <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Only PSA Cost</th>
                        <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Cumulative Savings</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.comparison.yearlyData
                        .filter((row: any) => typeof row.year === 'number' ? row.year >= 1 && row.year <= 10 : true)
                        .map((row: any, index: number) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
                              {typeof row.year === 'number' ? 'Year ' + row.year : row.year}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatIndianCurrency(row.competitionCost)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatIndianCurrency(row.absstemCost)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
                              {formatIndianCurrency(row.savings)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </ReportLayout>
    </div>
  );
}

export default PSAVsPSADeoxo;
