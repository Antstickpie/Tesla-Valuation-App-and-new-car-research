export type WheelChoice = '19' | '20' | '21';
export type TireChoice = 'summer' | 'all_seasons' | 'both';

export interface CarSnapshot {
  id: string;
  name: string;
  currentKm: number;
  trim: 'LR' | 'Perf';
  bodyColor: 'White' | 'Other';
  intColor: 'Black' | 'White';
  apPkg: 'Basic' | 'EAP' | 'FSD';
  hwVer: 'HW3' | 'HW4';
  proc: 'Ryzen' | 'Atom';
  wheels: WheelChoice;
  tires: TireChoice;
  towHitch: boolean;
  needsJuniperSuspension: boolean;
  gigaBerlin: boolean;
  askingPrice?: number;
  dedTires?: boolean;
  dedCurbrash?: boolean;
  dedBumper?: boolean;
  dedWindshield?: boolean;
  customDeduction?: number;
  customDeductionName?: string;
  warrantyYears: number;
  remainingKm: number;
  totalDeductions: number;
  deductionNotes?: string[];
  finalOffer: number;
  savedAt: string;
}

export interface ValuationSettings {
  baseKm: number;
  basePriceAnchor: number;
  yearValue: number;
  annualKm: number;
  perfAdder: number;
  colorAdder: number;
  interiorAdder: number;
  eapAdder: number;
  fsdAdder: number;
  hw4Adder: number;
  atomPenalty: number;
  // Option adders & adjustments
  towHitchAdder: number;
  wheels20Adder: number;
  winterTireSetAdder: number;
  summerOnlyPenalty: number;
  juniperSuspensionCost: number;
  includeJuniperInSpiderPrice: boolean;
  gigaBerlinAdder: number;
}

export interface DynamicInputs {
  currentKm: number;
  trim: 'LR' | 'Perf';
  bodyColor: 'White' | 'Other';
  intColor: 'Black' | 'White';
  apPkg: 'Basic' | 'EAP' | 'FSD';
  hwVer: 'HW3' | 'HW4';
  proc: 'Ryzen' | 'Atom';
  wheels: WheelChoice;
  tires: TireChoice;
  towHitch: boolean;
  needsJuniperSuspension: boolean;
  gigaBerlin: boolean;
  askingPrice?: number;
  dedTires: boolean;
  dedCurbrash: boolean;
  dedBumper: boolean;
  dedWindshield: boolean;
  customDeduction: number;
  customDeductionName: string;
}

export const DEFAULT_SETTINGS: ValuationSettings = {
  baseKm: 160000,
  basePriceAnchor: 23500,
  yearValue: 1000,
  annualKm: 25000,
  perfAdder: 2500,
  colorAdder: 500,
  interiorAdder: 500,
  eapAdder: 1200,
  fsdAdder: 2500,
  hw4Adder: 1800,
  atomPenalty: 1800,
  // Option defaults
  towHitchAdder: 800,
  wheels20Adder: 1000,
  winterTireSetAdder: 900,
  summerOnlyPenalty: 800,
  juniperSuspensionCost: 1500,
  includeJuniperInSpiderPrice: true,
  gigaBerlinAdder: 1000,
};

export const DEFAULT_INPUTS: DynamicInputs = {
  currentKm: 158122,
  trim: 'Perf',
  bodyColor: 'White',
  intColor: 'Black',
  apPkg: 'Basic',
  hwVer: 'HW3',
  proc: 'Ryzen',
  wheels: '21',
  tires: 'summer',
  towHitch: false,
  needsJuniperSuspension: false,
  gigaBerlin: false,
  askingPrice: 0,
  dedTires: true,
  dedCurbrash: true,
  dedBumper: true,
  dedWindshield: false,
  customDeduction: 0,
  customDeductionName: '',
};

export interface DeltaItem {
  item: string;
  val: number;
}
