export interface DeoxoDataItem {
  flow: number; // Nm3/hr
  ammoniaConsumptionKgHr?: number; // Ammonia consumption in Kg/hr
  hydrogenConsumptionKgHr?: number; // Hydrogen consumption in m3/hr
  coolingWaterFlow: number; // Cooling water flow required in M3/hr
  dryerHeaterPower: number; // Dryer Heater Power in KW
  ammoniaCrackerPower?: number | null; // Only for ammonia
}

export const deoxoDataForAmmonia: DeoxoDataItem[] = [
  { flow: 5, ammoniaConsumptionKgHr: 0.04, coolingWaterFlow: 1, dryerHeaterPower: 0.5, ammoniaCrackerPower: 3 },
  { flow: 10, ammoniaConsumptionKgHr: 0.08, coolingWaterFlow: 1, dryerHeaterPower: 0.5, ammoniaCrackerPower: 3 },
  { flow: 15, ammoniaConsumptionKgHr: 0.12, coolingWaterFlow: 1, dryerHeaterPower: 0.5, ammoniaCrackerPower: 3 },
  { flow: 20, ammoniaConsumptionKgHr: 0.16, coolingWaterFlow: 1, dryerHeaterPower: 0.5, ammoniaCrackerPower: 3 },
  { flow: 26, ammoniaConsumptionKgHr: 0.2, coolingWaterFlow: 1.5, dryerHeaterPower: 1.0, ammoniaCrackerPower: 3 },
  { flow: 31, ammoniaConsumptionKgHr: 0.24, coolingWaterFlow: 1.5, dryerHeaterPower: 1.0, ammoniaCrackerPower: 3 },
  { flow: 40, ammoniaConsumptionKgHr: 0.32, coolingWaterFlow: 1.5, dryerHeaterPower: 1.0, ammoniaCrackerPower: 3 },
  { flow: 50, ammoniaConsumptionKgHr: 0.4, coolingWaterFlow: 1.5, dryerHeaterPower: 1.0, ammoniaCrackerPower: 3 },
  { flow: 64, ammoniaConsumptionKgHr: 0.48, coolingWaterFlow: 1.5, dryerHeaterPower: 1.5, ammoniaCrackerPower: 3 },
  { flow: 75, ammoniaConsumptionKgHr: 0.6, coolingWaterFlow: 2.0, dryerHeaterPower: 1.5, ammoniaCrackerPower: 3 },
  { flow: 100, ammoniaConsumptionKgHr: 0.8, coolingWaterFlow: 2.0, dryerHeaterPower: 2.0, ammoniaCrackerPower: 3 },
  { flow: 130, ammoniaConsumptionKgHr: 1.0, coolingWaterFlow: 2.5, dryerHeaterPower: 2.0, ammoniaCrackerPower: 3 },
  { flow: 160, ammoniaConsumptionKgHr: 1.2, coolingWaterFlow: 2.5, dryerHeaterPower: 2.5, ammoniaCrackerPower: 3 },
  { flow: 182, ammoniaConsumptionKgHr: 1.4, coolingWaterFlow: 2.5, dryerHeaterPower: 2.5, ammoniaCrackerPower: 5.5 },
  { flow: 200, ammoniaConsumptionKgHr: 1.6, coolingWaterFlow: 3.0, dryerHeaterPower: 3.0, ammoniaCrackerPower: 5.5 },
  { flow: 267, ammoniaConsumptionKgHr: 2.0, coolingWaterFlow: 3.5, dryerHeaterPower: 3.5, ammoniaCrackerPower: 7.5 },
  { flow: 300, ammoniaConsumptionKgHr: 2.4, coolingWaterFlow: 4.5, dryerHeaterPower: 3.5, ammoniaCrackerPower: 7.5 },
  { flow: 330, ammoniaConsumptionKgHr: 2.8, coolingWaterFlow: 5.0, dryerHeaterPower: 5.0, ammoniaCrackerPower: 9.0 },
  { flow: 400, ammoniaConsumptionKgHr: 3.2, coolingWaterFlow: 6.0, dryerHeaterPower: 7.5, ammoniaCrackerPower: 9.0 },
  { flow: 500, ammoniaConsumptionKgHr: 4.0, coolingWaterFlow: 8.0, dryerHeaterPower: 9.0, ammoniaCrackerPower: 15.0 },
];

// ✅ Hydrogen dataset (no ammoniaCrackerPower)
// We can derive hydrogen consumption from ammonia consumption using the stoichiometric ratio (1 kg of ammonia produces approximately 1.875 kg of hydrogen)
// where in ammonia data where ammoniaCrackerPower is null, we can assume it's not applicable for hydrogen and set it to null as well. and value is taknen as 0 for calculation of hydrogen consumption.

export const deoxoDataForHydrogen = deoxoDataForAmmonia.map(item => ({
  flow: item.flow,
  hydrogenConsumptionKgHr: (item.ammoniaConsumptionKgHr ?? 0) * 1.875,
  coolingWaterFlow: item.coolingWaterFlow,
  dryerHeaterPower: item.dryerHeaterPower,
}));


// make sample deoxoDataForHydrogen we have used map but i want to see the values for hydrogen dataset as well, so here is the sample data for hydrogen dataset

