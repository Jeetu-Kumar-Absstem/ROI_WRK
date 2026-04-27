export interface DexoxDataItem {
  flow: number; // Nm3/hr
  ammoniaConsumptionKgHr: number; // Ammonia consumption in Kg/hr
  coolingWaterFlow: number; // Cooling water flow required in M3/hr
  dryerHeaterPower: number; // Dryer Heater Power in KW
  ammoniaCrackerPower: number | null; // Ammonia Cracker Power in KW, null if DDE
}

export const dexoxData: DexoxDataItem[] = [
  { flow: 5, ammoniaConsumptionKgHr: 0.04, coolingWaterFlow: 1, dryerHeaterPower: 0.5, ammoniaCrackerPower: null },
  { flow: 10, ammoniaConsumptionKgHr: 0.08, coolingWaterFlow: 1, dryerHeaterPower: 0.5, ammoniaCrackerPower: null },
  { flow: 15, ammoniaConsumptionKgHr: 0.12, coolingWaterFlow: 1, dryerHeaterPower: 0.5, ammoniaCrackerPower: null },
  { flow: 20, ammoniaConsumptionKgHr: 0.16, coolingWaterFlow: 1, dryerHeaterPower: 0.5, ammoniaCrackerPower: null },
  { flow: 26, ammoniaConsumptionKgHr: 0.2, coolingWaterFlow: 1.5, dryerHeaterPower: 1.0, ammoniaCrackerPower: null },
  { flow: 31, ammoniaConsumptionKgHr: 0.24, coolingWaterFlow: 1.5, dryerHeaterPower: 1.0, ammoniaCrackerPower: null },
  { flow: 40, ammoniaConsumptionKgHr: 0.32, coolingWaterFlow: 1.5, dryerHeaterPower: 1.0, ammoniaCrackerPower: null },
  { flow: 50, ammoniaConsumptionKgHr: 0.4, coolingWaterFlow: 1.5, dryerHeaterPower: 1.0, ammoniaCrackerPower: null },
  { flow: 64, ammoniaConsumptionKgHr: 0.48, coolingWaterFlow: 1.5, dryerHeaterPower: 1.5, ammoniaCrackerPower: null },
  { flow: 75, ammoniaConsumptionKgHr: 0.6, coolingWaterFlow: 2.0, dryerHeaterPower: 1.5, ammoniaCrackerPower: null },
  { flow: 100, ammoniaConsumptionKgHr: 0.8, coolingWaterFlow: 2.0, dryerHeaterPower: 2.0, ammoniaCrackerPower: null },
  { flow: 130, ammoniaConsumptionKgHr: 1.0, coolingWaterFlow: 2.5, dryerHeaterPower: 2.0, ammoniaCrackerPower: null },
  { flow: 160, ammoniaConsumptionKgHr: 1.2, coolingWaterFlow: 2.5, dryerHeaterPower: 2.5, ammoniaCrackerPower: null },
  { flow: 182, ammoniaConsumptionKgHr: 1.4, coolingWaterFlow: 2.5, dryerHeaterPower: 2.5, ammoniaCrackerPower: 5.5 },
  { flow: 200, ammoniaConsumptionKgHr: 1.6, coolingWaterFlow: 3.0, dryerHeaterPower: 3.0, ammoniaCrackerPower: 5.5 },
  { flow: 267, ammoniaConsumptionKgHr: 2.0, coolingWaterFlow: 3.5, dryerHeaterPower: 3.5, ammoniaCrackerPower: 7.5 },
  { flow: 300, ammoniaConsumptionKgHr: 2.4, coolingWaterFlow: 4.5, dryerHeaterPower: 3.5, ammoniaCrackerPower: 7.5 },
  { flow: 330, ammoniaConsumptionKgHr: 2.8, coolingWaterFlow: 5.0, dryerHeaterPower: 5.0, ammoniaCrackerPower: 9.0 },
  { flow: 400, ammoniaConsumptionKgHr: 3.2, coolingWaterFlow: 6.0, dryerHeaterPower: 7.5, ammoniaCrackerPower: 9.0 },
  { flow: 500, ammoniaConsumptionKgHr: 4.0, coolingWaterFlow: 8.0, dryerHeaterPower: 9.0, ammoniaCrackerPower: 15.0 },
];
