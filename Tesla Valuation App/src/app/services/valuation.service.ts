import { Injectable, signal, computed } from '@angular/core';
import {
  ValuationSettings,
  DynamicInputs,
  CarSnapshot,
  DEFAULT_SETTINGS,
  DEFAULT_INPUTS,
  DeltaItem,
} from '../models/valuation.model';

const STORAGE_SETTINGS_KEY = 'tesla_valuation_settings_ng';
const STORAGE_INPUTS_KEY = 'tesla_valuation_inputs_ng';
const STORAGE_CARS_KEY = 'tesla_valuation_cars_ng';

@Injectable({
  providedIn: 'root',
})
export class ValuationService {
  settings = signal<ValuationSettings>(this.loadSettings());
  inputs = signal<DynamicInputs>(this.loadInputs());
  cars = signal<CarSnapshot[]>(this.loadCars());
  currentCarTitle = signal<string>('');

  remainingKm = computed(() => 190000 - this.inputs().currentKm);

  warrantyYears = computed(() => {
    const annual = this.settings().annualKm;
    const remaining = this.remainingKm();
    if (annual <= 0 || remaining <= 0) return 0;
    return remaining / annual;
  });

  warrantyStatus = computed(() => {
    const rem = this.remainingKm();
    const years = this.warrantyYears();
    const annual = this.settings().annualKm;

    if (rem <= 0) {
      return {
        badgeClass: 'wb-red',
        badgeText: 'Warranty Expired',
        barWidth: '0%',
        barBg: 'var(--danger)',
        kmLeftText: `0 km left (${Math.abs(Math.round(rem)).toLocaleString()} km over 190k limit)`,
        yearsCalcText: `0.0 Years left at ${annual.toLocaleString()} km/yr`,
      };
    }

    const pct = Math.min(100, Math.max(0, (rem / 190000) * 100));
    let badgeClass = 'wb-red';
    let barBg = 'var(--danger)';
    let badgeText = `${years.toFixed(2)} Years (< 1 yr)`;

    if (years >= 2.0) {
      badgeClass = 'wb-green';
      barBg = 'var(--success)';
      badgeText = `${years.toFixed(1)} Years Left`;
    } else if (years >= 1.0) {
      badgeClass = 'wb-amber';
      barBg = 'var(--warning)';
      badgeText = `${years.toFixed(2)} Years Left`;
    }

    return {
      badgeClass,
      badgeText,
      barWidth: `${pct}%`,
      barBg,
      kmLeftText: `${Math.round(rem).toLocaleString()} km remaining (to 190,000 km)`,
      yearsCalcText: `${years.toFixed(2)} Years left at ${annual.toLocaleString()} km/yr`,
    };
  });

  deltas = computed<DeltaItem[]>(() => {
    const s = this.settings();
    const inp = this.inputs();
    const items: DeltaItem[] = [];

    // Warranty delta: remaining warranty years * yearValue
    const wy = this.warrantyYears();
    const warrantyDelta = wy * s.yearValue;
    items.push({
      item: `Warranty (${wy.toFixed(2)} yrs left @ €${s.yearValue}/yr)`,
      val: warrantyDelta,
    });

    // Trim delta
    const trimDelta = inp.trim === 'Perf' ? s.perfAdder : 0;
    items.push({
      item: `Trim (${inp.trim === 'Perf' ? 'Performance' : 'Long Range Baseline'})`,
      val: trimDelta,
    });

    // Body Color
    const bodyDelta = inp.bodyColor === 'Other' ? s.colorAdder : 0;
    items.push({
      item: `Body Colour (${inp.bodyColor === 'Other' ? 'Black / Metallic' : 'White Baseline'})`,
      val: bodyDelta,
    });

    // Interior Color
    const intDelta = inp.intColor === 'White' ? s.interiorAdder : 0;
    items.push({
      item: `Interior Colour (${inp.intColor === 'White' ? 'White Interior' : 'Black Baseline'})`,
      val: intDelta,
    });

    // Autopilot
    let apDelta = 0;
    let apName = 'Basic Autopilot (Baseline)';
    if (inp.apPkg === 'EAP') {
      apDelta = s.eapAdder;
      apName = 'Enhanced Autopilot (EAP)';
    } else if (inp.apPkg === 'FSD') {
      apDelta = s.fsdAdder;
      apName = 'Full Self-Driving (FSD)';
    }
    items.push({ item: `Autopilot Package (${apName})`, val: apDelta });

    // Hardware
    const hwDelta = inp.hwVer === 'HW4' ? s.hw4Adder : 0;
    items.push({
      item: `FSD Hardware (${inp.hwVer === 'HW4' ? 'HW4' : 'HW3 Baseline'})`,
      val: hwDelta,
    });

    // Processor
    const procDelta = inp.proc === 'Atom' ? -s.atomPenalty : 0;
    items.push({
      item: `Processor (${inp.proc === 'Atom' ? 'Intel Atom Penalty' : 'AMD Ryzen Baseline'})`,
      val: procDelta,
    });

    // Wheels: 20" Induction Wheels
    const wheelsDelta = inp.wheels === '20' ? s.wheels20Adder : 0;
    const wheelsLabel =
      inp.wheels === '20'
        ? `20" Induction Wheels (+€${s.wheels20Adder})`
        : inp.wheels === '21'
        ? '21" Überturbine Wheels (Perf Std)'
        : '19" Gemini Wheels (Base)';
    items.push({ item: `Wheels (${wheelsLabel})`, val: wheelsDelta });

    // Tyres & Extra Winter Set
    let tiresDelta = 0;
    let tiresLabel = 'All-Season Tyres (Standard)';
    if (inp.tires === 'both') {
      tiresDelta = s.winterTireSetAdder;
      tiresLabel = `Summer + Extra Winter Set (+€${s.winterTireSetAdder})`;
    } else if (inp.tires === 'summer') {
      tiresDelta = -s.summerOnlyPenalty;
      tiresLabel = `Summer Only (Winter Tyres Needed: -€${s.summerOnlyPenalty})`;
    }
    items.push({ item: `Tyres (${tiresLabel})`, val: tiresDelta });

    // Trailer Coupling / Tow Hitch
    const towDelta = inp.towHitch ? s.towHitchAdder : 0;
    items.push({
      item: `Trailer Coupling (${inp.towHitch ? `Yes (+€${s.towHitchAdder})` : 'None'})`,
      val: towDelta,
    });

    // Juniper Suspension Retrofit / Upgrade
    if (inp.needsJuniperSuspension) {
      const suspSign = s.juniperSuspensionCost >= 0 ? '+' : '-';
      items.push({
        item: `Suspension (Juniper Upgrade: ${suspSign}€${Math.abs(s.juniperSuspensionCost).toLocaleString()})`,
        val: s.juniperSuspensionCost,
      });
    }

    // Build Factory (Giga Berlin)
    const berlinDelta = inp.gigaBerlin ? s.gigaBerlinAdder : 0;
    items.push({
      item: `Build Factory (${inp.gigaBerlin ? 'Giga Berlin' : 'Shanghai / Fremont Base'})`,
      val: berlinDelta,
    });

    // Deductions
    const totalDeductions =
      (inp.dedTires ? 900 : 0) +
      (inp.dedCurbrash ? 300 : 0) +
      (inp.dedBumper ? 450 : 0) +
      (inp.dedWindshield ? 350 : 0) +
      (inp.customDeduction || 0);

    if (totalDeductions > 0) {
      items.push({
        item: 'Condition Deductions (Tires/Rash/Bumper/Repairs)',
        val: -totalDeductions,
      });
    }

    return items;
  });

  totalDeltas = computed(() =>
    this.deltas().reduce((acc, d) => acc + d.val, 0)
  );

  finalOffer = computed(() => {
    const base = this.settings().basePriceAnchor;
    return Math.round(base + this.totalDeltas());
  });

  updateSettings(partial: Partial<ValuationSettings>) {
    const next = { ...this.settings(), ...partial };
    this.settings.set(next);
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(next));
  }

  updateInputs(partial: Partial<DynamicInputs>) {
    const next = { ...this.inputs(), ...partial };
    this.inputs.set(next);
    localStorage.setItem(STORAGE_INPUTS_KEY, JSON.stringify(next));
  }

  addCurrentCar(name?: string): boolean {
    const currentList = this.cars();
    const inp = this.inputs();
    const chosenName = name?.trim() || this.currentCarTitle().trim();
    const carName =
      chosenName || `Car #${currentList.length + 1} (${inp.trim} - ${Math.round(inp.currentKm / 1000)}k km)`;

    const totalDeductions =
      (inp.dedTires ? 900 : 0) +
      (inp.dedCurbrash ? 300 : 0) +
      (inp.dedBumper ? 450 : 0) +
      (inp.dedWindshield ? 350 : 0) +
      (inp.customDeduction || 0);

    const deductionNotes: string[] = [];
    if (inp.dedTires) deductionNotes.push('Worn Tires (-€900)');
    if (inp.dedCurbrash) deductionNotes.push('Curb Rash (-€300)');
    if (inp.dedBumper) deductionNotes.push('Bumper Scrape (-€450)');
    if (inp.dedWindshield) deductionNotes.push('Windshield Scratch (-€350)');
    if (inp.customDeduction) {
      const cName = inp.customDeductionName?.trim() || 'Custom';
      deductionNotes.push(`${cName} (-€${inp.customDeduction})`);
    }

    const snapshot: CarSnapshot = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: carName,
      currentKm: inp.currentKm,
      trim: inp.trim,
      bodyColor: inp.bodyColor,
      intColor: inp.intColor,
      apPkg: inp.apPkg,
      hwVer: inp.hwVer,
      proc: inp.proc,
      wheels: inp.wheels,
      tires: inp.tires,
      towHitch: inp.towHitch,
      needsJuniperSuspension: !!inp.needsJuniperSuspension,
      gigaBerlin: !!inp.gigaBerlin,
      askingPrice: inp.askingPrice ? Number(inp.askingPrice) : 0,
      dedTires: !!inp.dedTires,
      dedCurbrash: !!inp.dedCurbrash,
      dedBumper: !!inp.dedBumper,
      dedWindshield: !!inp.dedWindshield,
      customDeduction: inp.customDeduction || 0,
      customDeductionName: inp.customDeductionName || '',
      warrantyYears: this.warrantyYears(),
      remainingKm: this.remainingKm(),
      totalDeductions,
      deductionNotes,
      finalOffer: this.finalOffer(),
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextList = [...currentList, snapshot];
    this.cars.set(nextList);
    localStorage.setItem(STORAGE_CARS_KEY, JSON.stringify(nextList));
    return true;
  }

  updateCarName(id: string, newName: string) {
    const trimmed = newName?.trim();
    if (!trimmed) return;
    const nextList = this.cars().map((c) => (c.id === id ? { ...c, name: trimmed } : c));
    this.cars.set(nextList);
    localStorage.setItem(STORAGE_CARS_KEY, JSON.stringify(nextList));
  }

  updateCar(id: string, updatedFields: Partial<CarSnapshot>) {
    const s = this.settings();
    const nextList = this.cars().map((car) => {
      if (car.id !== id) return car;
      const merged: CarSnapshot = { ...car, ...updatedFields };

      const totalDeductions =
        (merged.dedTires ? 900 : 0) +
        (merged.dedCurbrash ? 300 : 0) +
        (merged.dedBumper ? 450 : 0) +
        (merged.dedWindshield ? 350 : 0) +
        (Number(merged.customDeduction) || 0);

      const deductionNotes: string[] = [];
      if (merged.dedTires) deductionNotes.push('Worn Tires (-€900)');
      if (merged.dedCurbrash) deductionNotes.push('Curb Rash (-€300)');
      if (merged.dedBumper) deductionNotes.push('Bumper Scrape (-€450)');
      if (merged.dedWindshield) deductionNotes.push('Windshield Scratch (-€350)');
      if (merged.customDeduction) {
        const cName = merged.customDeductionName?.trim() || 'Custom';
        deductionNotes.push(`${cName} (-€${merged.customDeduction})`);
      }

      merged.totalDeductions = totalDeductions;
      merged.deductionNotes = deductionNotes;

      const calc = this.calculateCarOffer(merged, s);
      merged.finalOffer = calc.finalOffer;
      merged.warrantyYears = calc.warrantyYears;
      merged.remainingKm = calc.remainingKm;

      return merged;
    });

    this.cars.set(nextList);
    localStorage.setItem(STORAGE_CARS_KEY, JSON.stringify(nextList));
  }

  removeCar(id: string) {
    const nextList = this.cars().filter((c) => c.id !== id);
    this.cars.set(nextList);
    localStorage.setItem(STORAGE_CARS_KEY, JSON.stringify(nextList));
  }

  loadCarIntoCalculator(car: CarSnapshot) {
    this.currentCarTitle.set(car.name);
    this.updateInputs({
      currentKm: car.currentKm,
      trim: car.trim,
      bodyColor: car.bodyColor,
      intColor: car.intColor,
      apPkg: car.apPkg,
      hwVer: car.hwVer,
      proc: car.proc,
      wheels: car.wheels || '19',
      tires: car.tires || 'summer',
      towHitch: !!car.towHitch,
      needsJuniperSuspension: !!car.needsJuniperSuspension,
      gigaBerlin: !!car.gigaBerlin,
      askingPrice: car.askingPrice || 0,
      dedTires: car.dedTires !== undefined ? car.dedTires : (car.deductionNotes?.some(n => n.includes('Tires')) ?? false),
      dedCurbrash: car.dedCurbrash !== undefined ? car.dedCurbrash : (car.deductionNotes?.some(n => n.includes('Curb')) ?? false),
      dedBumper: car.dedBumper !== undefined ? car.dedBumper : (car.deductionNotes?.some(n => n.includes('Bumper')) ?? false),
      dedWindshield: car.dedWindshield !== undefined ? car.dedWindshield : (car.deductionNotes?.some(n => n.includes('Windshield')) ?? false),
      customDeduction: car.customDeduction || 0,
      customDeductionName: car.customDeductionName || '',
    });
  }

  calculateCarOffer(
    car: CarSnapshot,
    settings?: ValuationSettings
  ): {
    finalOffer: number;
    warrantyYears: number;
    remainingKm: number;
  } {
    const s = settings || this.settings();
    const remainingKm = 190000 - car.currentKm;
    const warrantyYears = s.annualKm > 0 && remainingKm > 0 ? remainingKm / s.annualKm : 0;
    const warrantyDelta = warrantyYears * s.yearValue;
    const trimDelta = car.trim === 'Perf' ? s.perfAdder : 0;
    const bodyDelta = car.bodyColor === 'Other' ? s.colorAdder : 0;
    const intDelta = car.intColor === 'White' ? s.interiorAdder : 0;
    const apDelta = car.apPkg === 'FSD' ? s.fsdAdder : car.apPkg === 'EAP' ? s.eapAdder : 0;
    const hwDelta = car.hwVer === 'HW4' ? s.hw4Adder : 0;
    const procDelta = car.proc === 'Atom' ? -s.atomPenalty : 0;
    const wheelsDelta = car.wheels === '20' ? s.wheels20Adder : 0;
    const tiresDelta =
      car.tires === 'both' ? s.winterTireSetAdder : car.tires === 'summer' ? -s.summerOnlyPenalty : 0;
    const towDelta = car.towHitch ? s.towHitchAdder : 0;
    const juniperDelta = car.needsJuniperSuspension ? s.juniperSuspensionCost : 0;
    const berlinDelta = car.gigaBerlin ? s.gigaBerlinAdder : 0;
    const deductions = car.totalDeductions || 0;

    const totalDeltas =
      warrantyDelta +
      trimDelta +
      bodyDelta +
      intDelta +
      apDelta +
      hwDelta +
      procDelta +
      wheelsDelta +
      tiresDelta +
      towDelta +
      juniperDelta +
      berlinDelta -
      deductions;

    const finalOffer = Math.round(s.basePriceAnchor + totalDeltas);

    return {
      finalOffer,
      warrantyYears,
      remainingKm,
    };
  }

  recalculateAllCars(): number {
    const s = this.settings();
    const updated = this.cars().map((car) => {
      const calc = this.calculateCarOffer(car, s);
      return {
        ...car,
        finalOffer: calc.finalOffer,
        warrantyYears: calc.warrantyYears,
        remainingKm: calc.remainingKm,
      };
    });
    this.cars.set(updated);
    localStorage.setItem(STORAGE_CARS_KEY, JSON.stringify(updated));
    return updated.length;
  }

  private loadSettings(): ValuationSettings {
    try {
      const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // fallback
    }
    return { ...DEFAULT_SETTINGS };
  }

  private loadInputs(): DynamicInputs {
    try {
      const raw = localStorage.getItem(STORAGE_INPUTS_KEY);
      if (raw) {
        return { ...DEFAULT_INPUTS, ...JSON.parse(raw) };
      }
    } catch {
      // fallback
    }
    return { ...DEFAULT_INPUTS };
  }

  private loadCars(): CarSnapshot[] {
    try {
      const raw = localStorage.getItem(STORAGE_CARS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  }
}
