/**
 * Single source of truth for every India-specific emission factor used by the
 * calculators. Each entry carries its provenance so the numbers stay
 * auditable; approximations are labelled as such. Values are kg CO2e unless
 * the unit says otherwise. Do not inline these numbers elsewhere.
 */

export interface EmissionFactor {
  readonly value: number;
  readonly unit: string;
  /** Provenance: dataset, derivation, or a labelled approximation. */
  readonly source: string;
}

export const EMISSION_FACTORS = {
  gridElectricity: {
    value: 0.716,
    unit: 'kg CO2e per kWh',
    source: 'CEA CO2 Baseline Database — weighted average grid emission factor (2023-24)',
  },
  lpgCylinder14kg: {
    value: 42.3,
    unit: 'kg CO2e per cylinder',
    source: '2.98 kg CO2 per kg LPG × 14.2 kg domestic cylinder',
  },
  pngGas: {
    value: 2.2,
    unit: 'kg CO2e per SCM',
    source: 'CPCB approximation for piped natural gas',
  },
  carPetrol: {
    value: 0.17,
    unit: 'kg CO2e per km',
    source: 'Mid-size petrol car at ARAI-typical mileage',
  },
  carDiesel: {
    value: 0.16,
    unit: 'kg CO2e per km',
    source: 'Mid-size diesel car, ARAI-typical mileage approximation',
  },
  carCng: {
    value: 0.12,
    unit: 'kg CO2e per km',
    source: 'CNG hatchback/sedan approximation',
  },
  suv: {
    value: 0.21,
    unit: 'kg CO2e per km',
    source: 'Petrol/diesel SUV blend approximation',
  },
  twoWheelerPetrol: {
    value: 0.045,
    unit: 'kg CO2e per km',
    source: '100-125cc commuter motorcycle/scooter approximation',
  },
  autoRickshawCng: {
    value: 0.07,
    unit: 'kg CO2e per vehicle-km',
    source: 'CNG three-wheeler; ≈0.035 per passenger at typical 2-pax sharing',
  },
  busPerPax: {
    value: 0.05,
    unit: 'kg CO2e per passenger-km',
    source: 'Urban diesel bus at typical Indian occupancy',
  },
  metroPerPax: {
    value: 0.015,
    unit: 'kg CO2e per passenger-km',
    source: 'DMRC-class metro with regenerative braking and partial solar supply mix',
  },
  trainPerPax: {
    value: 0.01,
    unit: 'kg CO2e per passenger-km',
    source: 'Indian Railways electrified network average',
  },
  flightDomestic: {
    value: 0.121,
    unit: 'kg CO2e per passenger-km',
    source: 'Domestic economy seat, excluding radiative forcing',
  },
  evCarPerKm: {
    value: 0.086,
    unit: 'kg CO2e per km',
    source: '0.12 kWh/km consumption × 0.716 grid factor',
  },
  ev2wPerKm: {
    value: 0.021,
    unit: 'kg CO2e per km',
    source: '0.03 kWh/km consumption × 0.716 grid factor',
  },
  vegMeal: {
    value: 0.5,
    unit: 'kg CO2e per meal',
    source: 'Meta-analysis approximation for an Indian vegetarian meal',
  },
  nonVegChickenMeal: {
    value: 1.0,
    unit: 'kg CO2e per meal',
    source: 'Meta-analysis approximation, chicken-based meal',
  },
  nonVegMuttonMeal: {
    value: 2.5,
    unit: 'kg CO2e per meal',
    source: 'Meta-analysis approximation, mutton/red-meat meal',
  },
  treeAbsorptionPerYear: {
    value: 21,
    unit: 'kg CO2 per tree per year',
    source: 'Commonly cited absorption figure for a mature broadleaf tree',
  },
  solarGenPerKwYear: {
    value: 1450,
    unit: 'kWh per kW per year',
    source: '≈4 kWh/kW/day average Indian insolation',
  },
  indiaPerCapitaAnnual: {
    value: 2000,
    unit: 'kg CO2e per person per year',
    source: '≈2.0 t energy-related CO2 per capita, India average',
  },
  indiaUrbanAffluentAnnual: {
    value: 4000,
    unit: 'kg CO2e per person per year',
    source: 'Urban middle/upper-income estimate (≈2× national average)',
  },
} as const satisfies Record<string, EmissionFactor>;

export type EmissionFactorKey = keyof typeof EMISSION_FACTORS;
