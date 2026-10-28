import {
  Component,
  inject,
  ElementRef,
  ViewChild,
  effect,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ValuationService } from '../../services/valuation.service';
import { CarSnapshot } from '../../models/valuation.model';
import {
  Chart,
  RadialLinearScale,
  RadarController,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(
  RadialLinearScale,
  RadarController,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export interface RadarDimension {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  calc: (car: CarSnapshot, allCars?: CarSnapshot[]) => number;
}

export interface FeatureHighlight {
  label: string;
  tag: string;
  type?: 'bonus' | 'neutral' | 'missing' | 'penalty' | 'defect';
  isDefect?: boolean;
  isPenalty?: boolean;
}

const STORAGE_RADAR_CATEGORIES = 'tesla_radar_categories_selected';

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <div class="card-title">
        <span>Car Comparison Spider Map (Radar)</span>
        <div class="title-right">
          @if (svc.cars().length > 0) {
            <button
              type="button"
              class="recalc-btn"
              [class.pulsing]="hasConfigChangedForCars()"
              (click)="recalculateCars()"
              title="Recalculate max offer and warranty for all saved cars using your current Config values"
            >
              <span class="recalc-icon" [class.spinning]="isRecalculating()">🔄</span>
              <span>Recalculate with Config</span>
            </button>
          }
          <span class="badge">{{ svc.cars().length }} Saved Cars</span>
          @if (svc.cars().length >= 2) {
            <div class="view-toggle">
              <button
                class="view-btn"
                [class.active]="viewMode() === 'cards'"
                (click)="viewMode.set('cards')"
              >
                Cards View
              </button>
              <button
                class="view-btn"
                [class.active]="viewMode() === 'table'"
                (click)="viewMode.set('table')"
              >
                Side-by-Side Table
              </button>
            </div>
          }
        </div>
      </div>

      @if (recalcNotice()) {
        <div class="recalc-banner">
          <span>{{ recalcNotice() }}</span>
          <button type="button" class="banner-close" (click)="recalcNotice.set(null)">✕</button>
        </div>
      }

      @if (svc.cars().length === 0) {
        <div class="empty-state">
          <p>No cars added to comparison yet.</p>
          <p class="sub">
            Configure a car on the <strong>Calculator</strong> tab and click
            <strong>"Save to Compare"</strong>.
          </p>
        </div>
      } @else {
        <!-- Cars Selector for Spider Map -->
        <div class="cars-radar-selector">
          <div class="cars-radar-header">
            <span class="selector-title">
              Cars to Plot on Spider Map ({{ selectedCarIdsForRadar().length }} of {{ svc.cars().length }} plotted):
            </span>
            <div class="selector-actions">
              <button type="button" class="preset-btn" (click)="selectAllCarsForRadar()">Select All</button>
              <button type="button" class="preset-btn" (click)="uncheckAllCarsForRadar()">Uncheck All</button>
              <button type="button" class="preset-btn" (click)="deselectAllCarsExceptFirst()">Only #1</button>
            </div>
          </div>
          <div class="car-checkbox-grid">
            @for (car of svc.cars(); track car.id; let idx = $index) {
              <label class="car-check-pill" [class.checked]="isCarOnRadar(car.id)">
                <input
                  type="checkbox"
                  [checked]="isCarOnRadar(car.id)"
                  (change)="toggleCarRadar(car.id)"
                />
                <span class="pill-dot" [style.background]="getColor(idx)"></span>
                <span class="pill-num">#{{ idx + 1 }}</span>
                <span class="pill-title">{{ car.name }}</span>
              </label>
            }
          </div>
        </div>

        <!-- Category Selector Toolbar -->
        <div class="category-toolbar">
          <div class="toolbar-header">
            <div class="title-with-badge">
              <span class="toolbar-title">
                Radar Categories ({{ selectedCategoryIds().length }} of {{ allDimensions.length }} selected):
              </span>
              <span class="autoscale-badge" title="Auto-scales offer price across plotted cars so points are clearly distinguished on the radar axis">
                ⚡ Auto-Scale: Price Active
              </span>
            </div>
            <div class="preset-links">
              <button type="button" class="preset-btn all-features-btn" (click)="selectAllCategories()">All Features ({{ allDimensions.length }})</button>
              <button type="button" class="preset-btn" (click)="uncheckAllCategories()">Uncheck All</button>
              <button type="button" class="preset-btn" (click)="setPreset('core')">Core 6</button>
              <button type="button" class="preset-btn" (click)="setPreset('tech')">Tech & Drive</button>
              <button type="button" class="preset-btn" (click)="setPreset('options')">Equipment</button>
              <button type="button" class="preset-btn" (click)="setPreset('value')">Value & Build</button>
            </div>
          </div>

          <div class="category-chips">
            @for (cat of allDimensions; track cat.id) {
              <button
                type="button"
                class="cat-chip"
                [class.active]="isCatSelected(cat.id)"
                (click)="toggleCategory(cat.id)"
              >
                <span class="chip-icon">{{ cat.icon }}</span>
                <span class="chip-label">{{ cat.label }}</span>
                <span class="chip-check">{{ isCatSelected(cat.id) ? '✓' : '+' }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Radar Chart Container -->
        <div class="chart-container">
          <canvas
            #spiderCanvas
            [class.hidden-canvas]="selectedCarIdsForRadar().length === 0 || selectedCategoryIds().length < 3"
          ></canvas>
          @if (selectedCarIdsForRadar().length === 0) {
            <div class="radar-empty-hint">
              <span class="hint-icon">🏎️</span>
              <p>No cars currently selected for the Spider Map.</p>
              <button type="button" class="preset-btn all-features-btn" (click)="selectAllCarsForRadar()">
                Select All Cars
              </button>
            </div>
          } @else if (selectedCategoryIds().length < 3) {
            <div class="radar-empty-hint">
              <span class="hint-icon">🕸️</span>
              <p>Select at least 3 categories to display the Spider Map polygon.</p>
              <button type="button" class="preset-btn all-features-btn" (click)="selectAllCategories()">
                Select All Features (15)
              </button>
            </div>
          }
        </div>

        <!-- View 1: Detailed Full Spec Cards -->
        @if (viewMode() === 'cards') {
          <div class="legend-cards">
            @for (car of svc.cars(); track car.id; let idx = $index) {
              <div class="car-summary-card" [style.border-top-color]="getColor(idx)">
                <!-- Card Header -->
                <div class="car-head">
                  <span class="car-tag" [style.background]="getColor(idx)">#{{ idx + 1 }}</span>
                  @if (editingId() === car.id) {
                    <div class="title-edit-wrap">
                      <input
                        #titleInput
                        type="text"
                        class="title-edit-input"
                        [value]="car.name"
                        (keyup.enter)="saveTitle(car.id, titleInput.value)"
                        (keyup.escape)="cancelEditing()"
                        (blur)="saveTitle(car.id, titleInput.value)"
                        maxlength="60"
                        autofocus
                      />
                      <button class="save-title-btn" (click)="saveTitle(car.id, titleInput.value)">✓</button>
                    </div>
                  } @else {
                    <strong class="car-title-text" (click)="startEditing(car.id)" title="Click to rename">
                      {{ car.name }}
                    </strong>
                    <button class="edit-title-btn" (click)="startEditing(car.id)" title="Rename title">✏️</button>
                  }
                  <button class="edit-inplace-head-btn" (click)="openInPlaceEditor(car)" title="Edit full specs in place">✏️ Edit</button>
                  <button class="delete-btn" (click)="svc.removeCar(car.id)" title="Remove car">✕</button>
                </div>

                <!-- Radar Map Toggle for this car -->
                <div class="radar-card-toggle">
                  <label class="toggle-check-label" [class.active]="isCarOnRadar(car.id)">
                    <input
                      type="checkbox"
                      [checked]="isCarOnRadar(car.id)"
                      (change)="toggleCarRadar(car.id)"
                    />
                    <span>{{ isCarOnRadar(car.id) ? '✓ Showing on Spider Map' : 'Hidden from Spider Map' }}</span>
                  </label>
                </div>

                <!-- Financial Hero Line -->
                <div class="card-hero-row">
                  <div class="hero-price">
                    <span class="hero-lbl">Target Max Offer</span>
                    <span class="hero-val">€{{ car.finalOffer.toLocaleString() }}</span>
                  </div>
                  @if (car.askingPrice && car.askingPrice > 0) {
                    <div class="hero-asking">
                      <span class="hero-lbl">Seller Asking</span>
                      <span class="hero-val font-mono">€{{ car.askingPrice.toLocaleString() }}</span>
                      <span
                        class="deal-gap-badge"
                        [class.gap-pos]="car.finalOffer >= car.askingPrice"
                        [class.gap-neg]="car.finalOffer < car.askingPrice"
                      >
                        {{ car.finalOffer >= car.askingPrice ? '✓ Bargain (+€' + (car.finalOffer - car.askingPrice).toLocaleString() + ')' : '⚠️ Over Offer (-€' + (car.askingPrice - car.finalOffer).toLocaleString() + ')' }}
                      </span>
                    </div>
                  }
                  <div class="hero-ded">
                    <span class="hero-lbl">Deductions</span>
                    <span class="hero-val" [class.red]="car.totalDeductions > 0">
                      {{ car.totalDeductions > 0 ? '-€' + car.totalDeductions.toLocaleString() : '€0 (Clean)' }}
                    </span>
                  </div>
                </div>

                <!-- Section 1: Value-Add Upgrades Highlight -->
                <div class="val-section adders-section">
                  <div class="section-title text-success">
                    <span>✨ Value Adders & Upgrades ({{ getValueAdders(car).length }})</span>
                  </div>
                  <div class="pill-cloud">
                    @for (item of getValueAdders(car); track item.label) {
                      <span class="val-pill pill-green" title="{{ item.label }}: {{ item.tag }}">
                        <span class="pill-icon">✓</span>
                        <span class="pill-text">{{ item.label }}</span>
                        <span class="pill-delta">{{ item.tag }}</span>
                      </span>
                    }
                    @if (getValueAdders(car).length === 0) {
                      <span class="empty-pill">No optional value adders selected</span>
                    }
                  </div>
                </div>

                <!-- Section 2: Missing Features & Deductions Highlight -->
                <div class="val-section missing-section">
                  <div class="section-title text-warn">
                    <span>⚠️ Missing Features & Deductions ({{ getMissingOrPenalties(car).length }})</span>
                  </div>
                  <div class="pill-cloud">
                    @for (item of getMissingOrPenalties(car); track item.label) {
                      <span
                        class="val-pill"
                        [class.pill-red]="item.isDefect || item.isPenalty"
                        [class.pill-amber]="!item.isDefect && !item.isPenalty"
                        title="{{ item.label }}: {{ item.tag }}"
                      >
                        <span class="pill-icon">{{ item.isDefect ? '✕' : item.isPenalty ? '⚠️' : '–' }}</span>
                        <span class="pill-text">{{ item.label }}</span>
                        <span class="pill-delta">{{ item.tag }}</span>
                      </span>
                    }
                    @if (getMissingOrPenalties(car).length === 0) {
                      <span class="clean-pill">✓ Fully loaded, no deductions or missing equipment!</span>
                    }
                  </div>
                </div>

                <!-- Complete Full Specs Sheet -->
                <div class="full-spec-grid">
                  @if (car.askingPrice && car.askingPrice > 0) {
                    <div class="spec-row">
                      <span class="spec-k">Asking vs Offer Gap</span>
                      <span
                        class="spec-v font-mono"
                        [class.badge-green-txt]="car.finalOffer >= car.askingPrice"
                        [class.danger-txt]="car.finalOffer < car.askingPrice"
                      >
                        €{{ car.askingPrice.toLocaleString() }} ({{ car.finalOffer >= car.askingPrice ? '+€' + (car.finalOffer - car.askingPrice).toLocaleString() + ' Under Offer' : '-€' + (car.askingPrice - car.finalOffer).toLocaleString() + ' Over Offer' }})
                      </span>
                    </div>
                  }
                  <div class="spec-row">
                    <span class="spec-k">Build Factory</span>
                    <span class="spec-v" [class.badge-green-txt]="car.gigaBerlin">
                      {{ car.gigaBerlin ? '🏭 Giga Berlin (+€' + svc.settings().gigaBerlinAdder.toLocaleString() + ')' : 'Shanghai / Fremont Base' }}
                    </span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-k">Trim / Powertrain</span>
                    <span class="spec-v" [class.badge-green-txt]="car.trim === 'Perf'">
                      {{ car.trim === 'Perf' ? 'Performance Dual Motor (+€' + svc.settings().perfAdder.toLocaleString() + ')' : 'Long Range Dual Motor' }}
                    </span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-k">Odometer</span>
                    <span class="spec-v font-mono">{{ car.currentKm.toLocaleString() }} km</span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-k">Battery Warranty</span>
                    <span class="spec-v highlight-w">
                      {{ car.warrantyYears.toFixed(2) }} yrs ({{ car.remainingKm > 0 ? (car.remainingKm | number) + ' km left' : 'Expired' }})
                    </span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-k">Suspension</span>
                    <span class="spec-v" [class.accent]="car.needsJuniperSuspension">
                      {{ car.needsJuniperSuspension ? 'Juniper Upgrade (' + (svc.settings().juniperSuspensionCost >= 0 ? '+' : '-') + '€' + Math.abs(svc.settings().juniperSuspensionCost).toLocaleString() + ', Soft)' : 'Stock Pre-Refresh (Stiffer)' }}
                    </span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-k">Autopilot</span>
                    <span class="spec-v" [class.badge-green-txt]="car.apPkg !== 'Basic'">
                      {{ formatAutopilot(car.apPkg) }}
                    </span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-k">FSD Computer</span>
                    <span class="spec-v">{{ car.hwVer === 'HW4' ? 'Hardware 4 (HW4)' : 'Hardware 3 (HW3)' }}</span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-k">Processor (MCU)</span>
                    <span class="spec-v" [class.danger-txt]="car.proc === 'Atom'" [class.badge-green-txt]="car.proc === 'Ryzen'">
                      {{ car.proc === 'Ryzen' ? 'AMD Ryzen (Fast MCU)' : 'Intel Atom (-€' + svc.settings().atomPenalty.toLocaleString() + ' Penalty)' }}
                    </span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-k">Wheels</span>
                    <span class="spec-v" [class.badge-green-txt]="car.wheels !== '19'">
                      {{ formatWheels(car.wheels) }}
                    </span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-k">Tyres & Sets</span>
                    <span class="spec-v" [class.badge-green-txt]="car.tires === 'both'" [class.danger-txt]="car.tires === 'summer'">
                      {{ formatTires(car.tires) }}
                    </span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-k">Tow Hitch</span>
                    <span class="spec-v" [class.badge-green-txt]="car.towHitch">
                      {{ car.towHitch ? 'Factory Hitch (+€' + svc.settings().towHitchAdder.toLocaleString() + ')' : 'No Hitch' }}
                    </span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-k">Body Colour</span>
                    <span class="spec-v">{{ car.bodyColor === 'Other' ? 'Black / Metallic Paint' : 'Pearl White Multi-Coat' }}</span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-k">Interior Colour</span>
                    <span class="spec-v">{{ car.intColor === 'White' ? 'Black & White Premium' : 'All Black Standard' }}</span>
                  </div>

                  @if (car.deductionNotes && car.deductionNotes.length > 0) {
                    <div class="spec-row full-w">
                      <span class="spec-k">Defects Noted</span>
                      <div class="defect-tags">
                        @for (note of car.deductionNotes; track note) {
                          <span class="defect-tag">{{ note }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>

                <!-- Footer Action -->
                <div class="card-footer-actions">
                  <button class="btn btn-primary edit-inplace-btn" (click)="openInPlaceEditor(car)" title="Edit full specs in place without leaving page">
                    <span>✏️ Edit in Place</span>
                  </button>
                  <button class="btn btn-secondary load-btn" (click)="loadCar(car)" title="Load into Calculator tab">
                    <span>⚡ Load</span>
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- View 2: Side-by-Side Matrix Table -->
        @if (viewMode() === 'table') {
          <div class="table-scroll-wrap">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th class="sticky-col">Specification</th>
                  @for (car of svc.cars(); track car.id; let idx = $index) {
                    <th [style.border-top]="'3px solid ' + getColor(idx)">
                      <div class="th-car">
                        <label class="th-check-label" title="Toggle on Spider Map">
                          <input
                            type="checkbox"
                            [checked]="isCarOnRadar(car.id)"
                            (change)="toggleCarRadar(car.id)"
                          />
                        </label>
                        <span class="car-tag" [style.background]="getColor(idx)">#{{ idx + 1 }}</span>
                        <span class="th-name" title="{{ car.name }}">{{ car.name }}</span>
                      </div>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="sticky-col spec-label">Target Max Offer</td>
                  @for (car of svc.cars(); track car.id) {
                    <td class="val-highlight">€{{ car.finalOffer.toLocaleString() }}</td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Seller Asking Price</td>
                  @for (car of svc.cars(); track car.id) {
                    <td class="font-mono">{{ car.askingPrice && car.askingPrice > 0 ? '€' + car.askingPrice.toLocaleString() : '–' }}</td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Deal Margin (Asking vs Offer)</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      @if (car.askingPrice && car.askingPrice > 0) {
                        <span
                          class="badge-pill"
                          [class.badge-green]="car.finalOffer >= car.askingPrice"
                          [class.badge-red]="car.finalOffer < car.askingPrice"
                        >
                          {{ car.finalOffer >= car.askingPrice ? '✓ Bargain (+€' + (car.finalOffer - car.askingPrice).toLocaleString() + ')' : '⚠️ Overpriced (-€' + (car.askingPrice - car.finalOffer).toLocaleString() + ')' }}
                        </span>
                      } @else {
                        <span class="text-muted">–</span>
                      }
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Current Mileage</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>{{ car.currentKm.toLocaleString() }} km</td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Battery Warranty</td>
                  @for (car of svc.cars(); track car.id) {
                    <td class="highlight-w">{{ car.warrantyYears.toFixed(2) }} yrs left</td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Factory Build</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      @if (car.gigaBerlin) {
                        <span class="badge-pill badge-green">✓ Giga Berlin (+€{{ svc.settings().gigaBerlinAdder.toLocaleString() }})</span>
                      } @else {
                        <span class="badge-pill badge-neutral">Shanghai / US</span>
                      }
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Model Trim</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      @if (car.trim === 'Perf') {
                        <span class="badge-pill badge-green">✓ Performance (+€{{ svc.settings().perfAdder.toLocaleString() }})</span>
                      } @else {
                        <span class="badge-pill badge-neutral">Long Range</span>
                      }
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Suspension</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      @if (car.needsJuniperSuspension) {
                        <span class="badge-pill badge-cyan">✓ Juniper ({{ svc.settings().juniperSuspensionCost >= 0 ? '+' : '-' }}€{{ Math.abs(svc.settings().juniperSuspensionCost).toLocaleString() }}, Soft)</span>
                      } @else {
                        <span class="badge-pill badge-amber">Stock (Stiffer)</span>
                      }
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Autopilot</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      @if (car.apPkg === 'FSD') {
                        <span class="badge-pill badge-green">✓ FSD (+€{{ svc.settings().fsdAdder.toLocaleString() }})</span>
                      } @else if (car.apPkg === 'EAP') {
                        <span class="badge-pill badge-green">✓ EAP (+€{{ svc.settings().eapAdder.toLocaleString() }})</span>
                      } @else {
                        <span class="badge-pill badge-neutral">Basic AP</span>
                      }
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">FSD Computer</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      @if (car.hwVer === 'HW4') {
                        <span class="badge-pill badge-green">HW4 (New)</span>
                      } @else {
                        <span class="badge-pill badge-neutral">HW3</span>
                      }
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">MCU Processor</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      @if (car.proc === 'Ryzen') {
                        <span class="badge-pill badge-green">✓ AMD Ryzen</span>
                      } @else {
                        <span class="badge-pill badge-red">⚠️ Atom (-€{{ svc.settings().atomPenalty.toLocaleString() }})</span>
                      }
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Wheels</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      @if (car.wheels === '21') {
                        <span class="badge-pill badge-green">✓ 21" Überturbine</span>
                      } @else if (car.wheels === '20') {
                        <span class="badge-pill badge-green">✓ 20" Induction (+€{{ svc.settings().wheels20Adder.toLocaleString() }})</span>
                      } @else {
                        <span class="badge-pill badge-neutral">19" Gemini</span>
                      }
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Tyres</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      @if (car.tires === 'both') {
                        <span class="badge-pill badge-green">✓ Summer + Winter (+€{{ svc.settings().winterTireSetAdder.toLocaleString() }})</span>
                      } @else if (car.tires === 'all_seasons') {
                        <span class="badge-pill badge-neutral">All-Season</span>
                      } @else {
                        <span class="badge-pill badge-red">⚠️ Summer Only (-€{{ svc.settings().summerOnlyPenalty.toLocaleString() }})</span>
                      }
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Tow Hitch</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      @if (car.towHitch) {
                        <span class="badge-pill badge-green">✓ Factory Hitch (+€{{ svc.settings().towHitchAdder.toLocaleString() }})</span>
                      } @else {
                        <span class="badge-pill badge-neutral">No Hitch</span>
                      }
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Paint / Interior</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>{{ car.bodyColor === 'Other' ? 'Paint (+€300)' : 'White' }} / {{ car.intColor === 'White' ? 'White (+€300)' : 'Black' }}</td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Total Deductions</td>
                  @for (car of svc.cars(); track car.id) {
                    <td [class.danger-txt]="car.totalDeductions > 0">
                      {{ car.totalDeductions > 0 ? '-€' + car.totalDeductions.toLocaleString() : '€0 (Clean)' }}
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Value Adders ({{ svc.cars().length }})</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      <div class="matrix-pill-stack">
                        @for (add of getValueAdders(car); track add.label) {
                          <span class="mini-tag mini-green">✓ {{ add.label }} ({{ add.tag }})</span>
                        }
                        @if (getValueAdders(car).length === 0) {
                          <span class="text-muted">None</span>
                        }
                      </div>
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Missing & Deductions</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      <div class="matrix-pill-stack">
                        @for (pen of getMissingOrPenalties(car); track pen.label) {
                          <span class="mini-tag" [class.mini-red]="pen.isDefect || pen.isPenalty" [class.mini-amber]="!pen.isDefect && !pen.isPenalty">
                            {{ pen.isDefect ? '✕' : pen.isPenalty ? '⚠️' : '–' }} {{ pen.label }} ({{ pen.tag }})
                          </span>
                        }
                        @if (getMissingOrPenalties(car).length === 0) {
                          <span class="mini-tag mini-green">Clean & Fully Loaded</span>
                        }
                      </div>
                    </td>
                  }
                </tr>
                <tr>
                  <td class="sticky-col spec-label">Action</td>
                  @for (car of svc.cars(); track car.id) {
                    <td>
                      <div class="table-actions-stack">
                        <button class="btn btn-primary btn-sm" (click)="openInPlaceEditor(car)" title="Edit car specs in place">
                          ✏️ Edit
                        </button>
                        <button class="btn btn-secondary btn-sm" (click)="loadCar(car)" title="Load into Calculator">
                          Load
                        </button>
                      </div>
                    </td>
                  }
                </tr>
              </tbody>
            </table>
          </div>
        }

        <!-- In-Place Car Editor Modal -->
        @if (editingCarSnapshot(); as editCar) {
          <div class="modal-backdrop" (click)="closeInPlaceEditor()">
            <div class="modal-dialog" (click)="$event.stopPropagation()">
              <!-- Modal Header -->
              <div class="modal-head">
                <div class="modal-title-wrap">
                  <span class="modal-badge">In-Place Editor</span>
                  <h3 class="modal-title">Edit: {{ editCar.name }}</h3>
                </div>
                <button type="button" class="modal-close-btn" (click)="closeInPlaceEditor()" title="Close (ESC)">✕</button>
              </div>

              <!-- Live Calculation Summary Strip -->
              <div class="modal-calc-strip">
                <div class="strip-item">
                  <span class="strip-lbl">Calculated Offer</span>
                  <span class="strip-val font-mono text-cyan">€{{ editCar.finalOffer.toLocaleString() }}</span>
                </div>
                @if (editCar.askingPrice && editCar.askingPrice > 0) {
                  <div class="strip-item">
                    <span class="strip-lbl">Asking vs Offer Gap</span>
                    <span
                      class="strip-val font-mono"
                      [class.text-success]="editCar.finalOffer >= editCar.askingPrice"
                      [class.text-danger]="editCar.finalOffer < editCar.askingPrice"
                    >
                      {{ editCar.finalOffer >= editCar.askingPrice ? '+€' + (editCar.finalOffer - editCar.askingPrice).toLocaleString() + ' (Bargain)' : '-€' + (editCar.askingPrice - editCar.finalOffer).toLocaleString() + ' (Overpriced)' }}
                    </span>
                  </div>
                }
                <div class="strip-item">
                  <span class="strip-lbl">Warranty</span>
                  <span class="strip-val">{{ editCar.warrantyYears.toFixed(2) }} yrs left</span>
                </div>
                <div class="strip-item">
                  <span class="strip-lbl">Deductions</span>
                  <span class="strip-val" [class.text-danger]="editCar.totalDeductions > 0">
                    {{ editCar.totalDeductions > 0 ? '-€' + editCar.totalDeductions.toLocaleString() : '€0' }}
                  </span>
                </div>
              </div>

              <!-- Modal Body (Scrollable) -->
              <div class="modal-body">
                <!-- Section 1: Title, Asking Price & Mileage -->
                <div class="editor-section-card">
                  <div class="editor-grid-3">
                    <div class="form-group">
                      <label>Car Title / Listing Name</label>
                      <input
                        type="text"
                        [ngModel]="editCar.name"
                        (ngModelChange)="updateEditingField('name', $event)"
                        placeholder="e.g. 2022 LR Munich"
                        maxlength="60"
                      />
                    </div>
                    <div class="form-group">
                      <label>Seller Asking Price (€)</label>
                      <input
                        type="number"
                        [ngModel]="editCar.askingPrice || null"
                        (ngModelChange)="updateEditingField('askingPrice', $event)"
                        placeholder="e.g. 29,500"
                        step="250"
                        min="0"
                      />
                    </div>
                    <div class="form-group">
                      <div class="label-with-quick">
                        <label>Mileage (KM)</label>
                        <div class="mini-km-btns">
                          <button type="button" (click)="adjustEditingKm(-10000)">-10k</button>
                          <button type="button" (click)="adjustEditingKm(10000)">+10k</button>
                        </div>
                      </div>
                      <input
                        type="number"
                        [ngModel]="editCar.currentKm"
                        (ngModelChange)="updateEditingField('currentKm', $event)"
                        step="1000"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <!-- Section 2: Equipment & Options Toggles -->
                <div class="editor-section-card">
                  <span class="section-heading">Vehicle Equipment & Factory Options</span>
                  <div class="editor-toggles-grid">
                    <!-- Trim -->
                    <div class="opt-col">
                      <label class="opt-label">Trim</label>
                      <div class="segmented-mini">
                        <button
                          type="button"
                          [class.active]="editCar.trim === 'LR'"
                          (click)="updateEditingField('trim', 'LR')"
                        >
                          Long Range
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.trim === 'Perf'"
                          (click)="updateEditingField('trim', 'Perf')"
                        >
                          Performance (+€{{ svc.settings().perfAdder.toLocaleString() }})
                        </button>
                      </div>
                    </div>

                    <!-- Factory Build -->
                    <div class="opt-col">
                      <label class="opt-label">Factory Build</label>
                      <div class="segmented-mini">
                        <button
                          type="button"
                          [class.active]="!editCar.gigaBerlin"
                          (click)="updateEditingField('gigaBerlin', false)"
                        >
                          Shanghai / US
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.gigaBerlin"
                          (click)="updateEditingField('gigaBerlin', true)"
                        >
                          Giga Berlin (+€{{ svc.settings().gigaBerlinAdder.toLocaleString() }})
                        </button>
                      </div>
                    </div>

                    <!-- Juniper Suspension -->
                    <div class="opt-col">
                      <label class="opt-label">Juniper Suspension</label>
                      <div class="segmented-mini">
                        <button
                          type="button"
                          [class.active]="!editCar.needsJuniperSuspension"
                          (click)="updateEditingField('needsJuniperSuspension', false)"
                        >
                          Stock (Stiff)
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.needsJuniperSuspension"
                          (click)="updateEditingField('needsJuniperSuspension', true)"
                        >
                          Juniper Retrofit ({{ svc.settings().juniperSuspensionCost >= 0 ? '+' : '-' }}€{{ Math.abs(svc.settings().juniperSuspensionCost).toLocaleString() }})
                        </button>
                      </div>
                    </div>

                    <!-- Autopilot -->
                    <div class="opt-col">
                      <label class="opt-label">Autopilot Package</label>
                      <div class="segmented-mini">
                        <button
                          type="button"
                          [class.active]="editCar.apPkg === 'Basic'"
                          (click)="updateEditingField('apPkg', 'Basic')"
                        >
                          Basic
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.apPkg === 'EAP'"
                          (click)="updateEditingField('apPkg', 'EAP')"
                        >
                          EAP (+€{{ svc.settings().eapAdder.toLocaleString() }})
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.apPkg === 'FSD'"
                          (click)="updateEditingField('apPkg', 'FSD')"
                        >
                          FSD (+€{{ svc.settings().fsdAdder.toLocaleString() }})
                        </button>
                      </div>
                    </div>

                    <!-- Processor -->
                    <div class="opt-col">
                      <label class="opt-label">Processor (MCU)</label>
                      <div class="segmented-mini">
                        <button
                          type="button"
                          [class.active]="editCar.proc === 'Ryzen'"
                          (click)="updateEditingField('proc', 'Ryzen')"
                        >
                          AMD Ryzen (Fast)
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.proc === 'Atom'"
                          (click)="updateEditingField('proc', 'Atom')"
                        >
                          Intel Atom (-€{{ svc.settings().atomPenalty.toLocaleString() }})
                        </button>
                      </div>
                    </div>

                    <!-- FSD Hardware -->
                    <div class="opt-col">
                      <label class="opt-label">FSD Computer</label>
                      <div class="segmented-mini">
                        <button
                          type="button"
                          [class.active]="editCar.hwVer === 'HW3'"
                          (click)="updateEditingField('hwVer', 'HW3')"
                        >
                          HW3
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.hwVer === 'HW4'"
                          (click)="updateEditingField('hwVer', 'HW4')"
                        >
                          HW4 (+€{{ svc.settings().hw4Adder.toLocaleString() }})
                        </button>
                      </div>
                    </div>

                    <!-- Wheels -->
                    <div class="opt-col">
                      <label class="opt-label">Wheels</label>
                      <div class="segmented-mini">
                        <button
                          type="button"
                          [class.active]="editCar.wheels === '19'"
                          (click)="updateEditingField('wheels', '19')"
                        >
                          19" Gemini
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.wheels === '20'"
                          (click)="updateEditingField('wheels', '20')"
                        >
                          20" Induction (+€{{ svc.settings().wheels20Adder.toLocaleString() }})
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.wheels === '21'"
                          (click)="updateEditingField('wheels', '21')"
                        >
                          21" Überturbine
                        </button>
                      </div>
                    </div>

                    <!-- Tyres -->
                    <div class="opt-col">
                      <label class="opt-label">Tyres Package</label>
                      <div class="segmented-mini">
                        <button
                          type="button"
                          [class.active]="editCar.tires === 'both'"
                          (click)="updateEditingField('tires', 'both')"
                        >
                          Summer + Winter Sets (+€{{ svc.settings().winterTireSetAdder.toLocaleString() }})
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.tires === 'all_seasons'"
                          (click)="updateEditingField('tires', 'all_seasons')"
                        >
                          All Seasons
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.tires === 'summer'"
                          (click)="updateEditingField('tires', 'summer')"
                        >
                          Summer Only (-€{{ svc.settings().summerOnlyPenalty.toLocaleString() }})
                        </button>
                      </div>
                    </div>

                    <!-- Tow Hitch -->
                    <div class="opt-col">
                      <label class="opt-label">Tow Hitch</label>
                      <div class="segmented-mini">
                        <button
                          type="button"
                          [class.active]="!editCar.towHitch"
                          (click)="updateEditingField('towHitch', false)"
                        >
                          No
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.towHitch"
                          (click)="updateEditingField('towHitch', true)"
                        >
                          Yes (+€{{ svc.settings().towHitchAdder.toLocaleString() }})
                        </button>
                      </div>
                    </div>

                    <!-- Paint -->
                    <div class="opt-col">
                      <label class="opt-label">Paint Colour</label>
                      <div class="segmented-mini">
                        <button
                          type="button"
                          [class.active]="editCar.bodyColor === 'White'"
                          (click)="updateEditingField('bodyColor', 'White')"
                        >
                          White Base
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.bodyColor === 'Other'"
                          (click)="updateEditingField('bodyColor', 'Other')"
                        >
                          Metallic / Black (+€{{ svc.settings().colorAdder.toLocaleString() }})
                        </button>
                      </div>
                    </div>

                    <!-- Interior -->
                    <div class="opt-col">
                      <label class="opt-label">Interior Colour</label>
                      <div class="segmented-mini">
                        <button
                          type="button"
                          [class.active]="editCar.intColor === 'Black'"
                          (click)="updateEditingField('intColor', 'Black')"
                        >
                          Black Standard
                        </button>
                        <button
                          type="button"
                          [class.active]="editCar.intColor === 'White'"
                          (click)="updateEditingField('intColor', 'White')"
                        >
                          White Premium (+€{{ svc.settings().interiorAdder.toLocaleString() }})
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Section 3: Condition Deductions -->
                <div class="editor-section-card">
                  <span class="section-heading">Condition Flaws & Deductions</span>
                  <div class="editor-ded-grid">
                    <label class="ded-chip" [class.checked]="editCar.dedTires">
                      <input
                        type="checkbox"
                        [checked]="editCar.dedTires"
                        (change)="updateEditingField('dedTires', $any($event.target).checked)"
                      />
                      <span>Worn Tires (-€900)</span>
                    </label>

                    <label class="ded-chip" [class.checked]="editCar.dedCurbrash">
                      <input
                        type="checkbox"
                        [checked]="editCar.dedCurbrash"
                        (change)="updateEditingField('dedCurbrash', $any($event.target).checked)"
                      />
                      <span>Curb Rash (-€300)</span>
                    </label>

                    <label class="ded-chip" [class.checked]="editCar.dedBumper">
                      <input
                        type="checkbox"
                        [checked]="editCar.dedBumper"
                        (change)="updateEditingField('dedBumper', $any($event.target).checked)"
                      />
                      <span>Bumper Scrape (-€450)</span>
                    </label>

                    <label class="ded-chip" [class.checked]="editCar.dedWindshield">
                      <input
                        type="checkbox"
                        [checked]="editCar.dedWindshield"
                        (change)="updateEditingField('dedWindshield', $any($event.target).checked)"
                      />
                      <span>Windshield Scratch (-€350)</span>
                    </label>
                  </div>

                  <!-- Custom Deduction -->
                  <div class="custom-ded-inline-row">
                    <input
                      type="text"
                      class="custom-name-field"
                      placeholder="Other deduction reason (e.g. scratch, dent)..."
                      [ngModel]="editCar.customDeductionName || ''"
                      (ngModelChange)="updateEditingField('customDeductionName', $event)"
                      maxlength="50"
                    />
                    <div class="custom-amt-field">
                      <span>-€</span>
                      <input
                        type="number"
                        placeholder="0"
                        [ngModel]="editCar.customDeduction || null"
                        (ngModelChange)="updateEditingField('customDeduction', $event)"
                        min="0"
                        step="50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Modal Footer Actions -->
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeInPlaceEditor()">
                  Cancel
                </button>
                <button type="button" class="btn btn-primary save-inplace-btn" (click)="saveInPlaceEdits()">
                  <span>💾 Save Changes In Place</span>
                </button>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .title-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .recalc-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(99, 102, 241, 0.15));
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      font-size: 0.74rem;
      font-weight: 700;
      padding: 5px 11px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(99, 102, 241, 0.25));
        border-color: #38bdf8;
        color: #fff;
        transform: translateY(-1px);
      }

      &.pulsing {
        border-color: #22c55e;
        color: #4ade80;
        background: rgba(34, 197, 94, 0.15);
        box-shadow: 0 0 10px rgba(34, 197, 94, 0.25);
      }

      .recalc-icon {
        font-size: 0.85rem;
        transition: transform 0.3s ease;

        &.spinning {
          animation: spin 0.6s linear infinite;
        }
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .recalc-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #4ade80;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.76rem;
      font-weight: 600;
      margin-bottom: 12px;

      .banner-close {
        background: none;
        border: none;
        color: #4ade80;
        cursor: pointer;
        font-size: 0.8rem;
        padding: 0 4px;
        opacity: 0.8;
        &:hover { opacity: 1; }
      }
    }

    .view-toggle {
      display: flex;
      background: #090c13;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 2px;
      gap: 2px;

      .view-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 0.72rem;
        font-weight: 700;
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;

        &.active {
          background: #22293a;
          color: #fff;
        }
      }
    }

    /* Cars Radar Selector Toolbar */
    .cars-radar-selector {
      background: rgba(15, 23, 42, 0.45);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 12px;

      .cars-radar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;

        .selector-title {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .selector-actions {
          display: flex;
          gap: 6px;
        }
      }

      .car-checkbox-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;

        .car-check-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0b0e15;
          border: 1px solid #242c3e;
          border-radius: 8px;
          padding: 5px 10px;
          color: var(--text-muted);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;

          input[type="checkbox"] {
            width: 14px;
            height: 14px;
            accent-color: var(--primary);
            cursor: pointer;
          }

          .pill-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
          }

          .pill-num {
            font-weight: 800;
            color: #fff;
          }

          .pill-title {
            max-width: 140px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          &:hover {
            border-color: #3b4763;
            color: #fff;
          }

          &.checked {
            background: rgba(30, 41, 59, 0.8);
            border-color: rgba(56, 189, 248, 0.4);
            color: #fff;
          }
        }
      }
    }

    /* Category Toolbar */
    .category-toolbar {
      background: rgba(15, 23, 42, 0.45);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 16px;

      .toolbar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;

        .title-with-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .toolbar-title {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .autoscale-badge {
          font-size: 0.68rem;
          font-weight: 700;
          color: #4ade80;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 6px;
          padding: 2px 7px;
          letter-spacing: 0.02em;
        }

        .preset-links {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;

          .preset-btn {
            background: #1a2233;
            border: 1px solid #28344e;
            color: var(--text-muted);
            border-radius: 6px;
            padding: 3px 8px;
            font-size: 0.7rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover {
              background: #253147;
              color: #fff;
            }

            &.all-features-btn {
              background: rgba(56, 189, 248, 0.16);
              border-color: rgba(56, 189, 248, 0.45);
              color: var(--accent);
              font-weight: 700;

              &:hover {
                background: rgba(56, 189, 248, 0.3);
                color: #fff;
              }
            }
          }
        }
      }

      .category-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;

        .cat-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #0b0e15;
          border: 1px solid #242c3e;
          border-radius: 8px;
          padding: 5px 10px;
          color: var(--text-muted);
          font-size: 0.74rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;

          .chip-icon { font-size: 0.85rem; }
          .chip-check {
            font-size: 0.72rem;
            color: var(--text-dim);
            font-weight: 800;
          }

          &:hover {
            border-color: #3b4763;
            color: #fff;
          }

          &.active {
            background: rgba(56, 189, 248, 0.12);
            border-color: rgba(56, 189, 248, 0.4);
            color: #fff;

            .chip-check {
              color: var(--accent);
            }
          }
        }
      }
    }

    .chart-container {
      position: relative;
      width: 100%;
      max-width: 680px;
      margin: 0 auto 24px auto;
      height: 440px;

      @media (min-width: 1200px) {
        max-width: 820px;
        height: 520px;
      }

      @media (min-width: 1600px) {
        max-width: 960px;
        height: 580px;
      }

      .hidden-canvas {
        display: none !important;
      }

      .radar-empty-hint {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        text-align: center;
        color: var(--text-muted);
        font-size: 0.82rem;
        background: rgba(11, 14, 21, 0.4);
        border: 1px dashed #242c3f;
        border-radius: 12px;
        padding: 20px;

        .hint-icon {
          font-size: 2.2rem;
          opacity: 0.8;
        }

        p {
          margin: 0;
          max-width: 280px;
          color: var(--text);
          font-weight: 600;
        }
      }
    }

    /* Cards Grid */
    .legend-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .car-summary-card {
      background: #0f121a;
      border: 1px solid #262c3e;
      border-top: 4px solid var(--primary);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .car-head {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;

      .title-edit-wrap {
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 1;
        min-width: 0;

        .title-edit-input {
          flex: 1;
          min-width: 0;
          background: #090c13;
          border: 1px solid var(--accent);
          border-radius: 6px;
          color: #fff;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 3px 6px;
          outline: none;
        }

        .save-title-btn {
          background: var(--success);
          border: none;
          color: #000;
          font-weight: 800;
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 0.76rem;
          cursor: pointer;
        }
      }

      .car-title-text {
        font-size: 0.92rem;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
        color: #fff;

        &:hover { color: var(--accent); }
      }

      .edit-title-btn {
        background: none;
        border: none;
        font-size: 0.82rem;
        cursor: pointer;
        opacity: 0.7;
        &:hover { opacity: 1; }
      }
    }

    .radar-card-toggle {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      background: rgba(11, 14, 21, 0.6);
      border: 1px solid #1a202e;
      border-radius: 6px;

      .toggle-check-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--text-muted);
        cursor: pointer;
        width: 100%;

        input[type="checkbox"] {
          accent-color: var(--accent);
          cursor: pointer;
        }

        &.active {
          color: var(--accent);
        }
      }
    }

    .car-tag {
      font-size: 0.72rem;
      font-weight: 800;
      color: #fff;
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .delete-btn {
      background: none;
      border: none;
      color: var(--danger);
      font-weight: 700;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
      &:hover { background: var(--danger-bg); }
    }

    .card-hero-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
      background: #141824;
      border-radius: 8px;
      padding: 8px 12px;

      .hero-price, .hero-asking, .hero-ded {
        display: flex;
        flex-direction: column;
      }

      .hero-lbl {
        font-size: 0.68rem;
        color: var(--text-muted);
        text-transform: uppercase;
        font-weight: 700;
      }

      .hero-val {
        font-family: ui-monospace, monospace;
        font-size: 1.15rem;
        font-weight: 800;
        color: #fff;

        &.red { color: var(--danger); }
      }

      .deal-gap-badge {
        font-size: 0.66rem;
        font-weight: 750;
        margin-top: 2px;
        white-space: nowrap;

        &.gap-pos { color: #4ade80; }
        &.gap-neg { color: #f87171; }
      }
    }

    /* Full spec grid */
    .full-spec-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
      background: rgba(11, 14, 21, 0.6);
      border: 1px solid #1a202e;
      border-radius: 8px;
      padding: 10px;

      .spec-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-size: 0.76rem;
        padding: 3px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);

        &:last-child { border-bottom: none; }

        &.full-w {
          flex-direction: column;
          gap: 4px;
        }

        .spec-k {
          color: var(--text-muted);
          font-weight: 600;
        }

        .spec-v {
          color: var(--text);
          font-weight: 600;
          text-align: right;

          &.highlight-w { color: var(--accent); }
          &.accent { color: #38bdf8; font-weight: 700; }
          &.danger-txt { color: var(--danger); }
        }
      }

      .defect-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;

        .defect-tag {
          font-size: 0.68rem;
          color: var(--danger);
          background: var(--danger-bg);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }
      }
    }

    .load-btn {
      width: 100%;
      padding: 8px;
      font-size: 0.76rem;
      margin-top: auto;
    }

    /* Matrix Table View */
    .table-scroll-wrap {
      width: 100%;
      overflow-x: auto;
      border: 1px solid var(--card-border);
      border-radius: 10px;
    }

    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;

      th, td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #1f2638;
        border-right: 1px solid #1f2638;
        white-space: nowrap;

        &:last-child { border-right: none; }
      }

      th {
        background: #141824;
        font-weight: 700;
      }

      .sticky-col {
        position: sticky;
        left: 0;
        background: #10141f;
        z-index: 2;
        font-weight: 700;
        color: var(--text-muted);
      }

      .th-car {
        display: flex;
        align-items: center;
        gap: 6px;

        .th-check-label {
          display: flex;
          align-items: center;
          cursor: pointer;

          input[type="checkbox"] {
            accent-color: var(--accent);
            cursor: pointer;
          }
        }

        .th-name {
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .val-highlight {
        font-family: ui-monospace, monospace;
        font-weight: 800;
        color: #fff;
        font-size: 0.88rem;
      }

      .danger-txt { color: var(--danger); }
      .accent { color: var(--accent); }

      .btn-sm {
        padding: 4px 8px;
        font-size: 0.7rem;
      }
    }

    /* Value Highlight Sections in Cards */
    .val-section {
      background: rgba(11, 14, 21, 0.65);
      border: 1px solid #1a202e;
      border-radius: 8px;
      padding: 8px 10px;

      &.adders-section {
        border-color: rgba(34, 197, 94, 0.25);
        background: rgba(34, 197, 94, 0.04);
      }

      &.missing-section {
        border-color: rgba(245, 158, 11, 0.25);
        background: rgba(245, 158, 11, 0.04);
      }

      .section-title {
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        margin-bottom: 6px;

        &.text-success { color: #4ade80; }
        &.text-warn { color: #f59e0b; }
      }

      .pill-cloud {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;

        .empty-pill, .clean-pill {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .clean-pill {
          color: #4ade80;
          font-style: normal;
          font-weight: 600;
        }

        .val-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 6px;
          padding: 3px 7px;
          font-size: 0.69rem;
          font-weight: 600;
          line-height: 1.2;

          .pill-icon {
            font-weight: 800;
            font-size: 0.72rem;
          }

          .pill-text {
            color: #fff;
          }

          .pill-delta {
            font-family: ui-monospace, monospace;
            font-weight: 700;
            opacity: 0.9;
          }

          &.pill-green {
            background: rgba(34, 197, 94, 0.14);
            border: 1px solid rgba(34, 197, 94, 0.35);
            color: #4ade80;
            .pill-delta { color: #86efac; }
          }

          &.pill-amber {
            background: rgba(245, 158, 11, 0.12);
            border: 1px solid rgba(245, 158, 11, 0.35);
            color: #fbbf24;
            .pill-delta { color: #fcd34d; }
          }

          &.pill-red {
            background: rgba(239, 68, 68, 0.14);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #f87171;
            .pill-delta { color: #fca5a5; }
          }
        }
      }
    }

    .badge-green-txt {
      color: #4ade80 !important;
      font-weight: 700 !important;
    }

    /* Table Badges & Mini Tags */
    .badge-pill {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      white-space: nowrap;

      &.badge-green {
        background: rgba(34, 197, 94, 0.15);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.3);
      }

      &.badge-cyan {
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.3);
      }

      &.badge-amber {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }

      &.badge-red {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      &.badge-neutral {
        background: #182030;
        color: var(--text-muted);
        border: 1px solid #28344e;
      }
    }

    .matrix-pill-stack {
      display: flex;
      flex-direction: column;
      gap: 3px;
      max-width: 240px;

      .mini-tag {
        display: inline-block;
        font-size: 0.67rem;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        white-space: normal;
        line-height: 1.2;

        &.mini-green {
          background: rgba(34, 197, 94, 0.12);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }

        &.mini-amber {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.25);
        }

        &.mini-red {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: var(--text-muted);
      p { margin: 4px 0; }
      .sub { font-size: 0.82rem; }
    }

    .edit-inplace-head-btn {
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: #38bdf8;
      font-size: 0.68rem;
      font-weight: 750;
      padding: 2px 7px;
      border-radius: 5px;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s ease;

      &:hover {
        background: rgba(56, 189, 248, 0.25);
        color: #fff;
      }
    }

    .card-footer-actions {
      display: flex;
      gap: 8px;
      margin-top: 4px;

      .edit-inplace-btn {
        flex: 1.25;
        background: linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(99, 102, 241, 0.18));
        border: 1px solid rgba(56, 189, 248, 0.45);
        color: #38bdf8;
        font-size: 0.78rem;
        font-weight: 700;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;

        &:hover {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(99, 102, 241, 0.3));
          border-color: #38bdf8;
          color: #fff;
          transform: translateY(-1px);
        }
      }

      .load-btn {
        flex: 1;
        font-size: 0.78rem;
        padding: 8px 10px;
      }
    }

    .table-actions-stack {
      display: flex;
      gap: 5px;
      justify-content: center;

      .btn-sm {
        padding: 4px 8px;
        font-size: 0.72rem;
      }
    }

    /* In-Place Car Editor Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(4, 6, 11, 0.82);
      backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 16px;
      animation: fadeIn 0.15s ease-out;
    }

    .modal-dialog {
      background: #0f131d;
      border: 1px solid var(--card-border);
      border-top: 3px solid var(--accent);
      border-radius: 14px;
      width: 100%;
      max-width: 760px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75);
      animation: slideUp 0.2s ease-out;
      overflow: hidden;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      border-bottom: 1px solid #1a2133;
      background: #141926;

      .modal-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;

        .modal-badge {
          background: rgba(56, 189, 248, 0.15);
          color: var(--accent);
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 6px;
          border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .modal-title {
          font-size: 1rem;
          font-weight: 800;
          color: #fff;
          margin: 0;
        }
      }

      .modal-close-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 1.1rem;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        &:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
      }
    }

    .modal-calc-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #090c13;
      padding: 10px 18px;
      border-bottom: 1px solid #1a2133;
      flex-wrap: wrap;
      gap: 12px;

      .strip-item {
        display: flex;
        flex-direction: column;

        .strip-lbl {
          font-size: 0.65rem;
          color: var(--text-dim);
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .strip-val {
          font-size: 0.95rem;
          font-weight: 800;
          color: #fff;
        }
      }
    }

    .modal-body {
      padding: 16px 18px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex: 1;
    }

    .editor-section-card {
      background: rgba(18, 24, 38, 0.6);
      border: 1px solid #1a2235;
      border-radius: 10px;
      padding: 12px 14px;

      .section-heading {
        display: block;
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--accent);
        margin-bottom: 10px;
      }
    }

    .editor-grid-3 {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;

      @media (min-width: 600px) {
        grid-template-columns: 1.2fr 0.9fr 0.9fr;
      }

      .form-group {
        margin-bottom: 0;

        label {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .label-with-quick {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;

          label { margin-bottom: 0; }

          .mini-km-btns {
            display: flex;
            gap: 4px;

            button {
              background: #242c3f;
              border: none;
              color: var(--text-muted);
              font-size: 0.68rem;
              font-weight: 700;
              padding: 2px 6px;
              border-radius: 4px;
              cursor: pointer;
              &:hover { background: #38bdf8; color: #000; }
            }
          }
        }

        input {
          width: 100%;
          background: #090c13;
          border: 1px solid #242c3e;
          border-radius: 7px;
          color: #fff;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 7px 10px;
          outline: none;
          box-sizing: border-box;

          &:focus {
            border-color: var(--accent);
          }
        }
      }
    }

    .editor-toggles-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;

      @media (min-width: 580px) {
        grid-template-columns: 1fr 1fr;
      }

      .opt-col {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .opt-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }
      }
    }

    .segmented-mini {
      display: flex;
      background: #090c13;
      border: 1px solid #242c3e;
      border-radius: 7px;
      padding: 2px;
      gap: 2px;

      button {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 0.72rem;
        font-weight: 700;
        padding: 5px 6px;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;

        &.active {
          background: #232c40;
          color: #fff;
          border: 1px solid rgba(56, 189, 248, 0.35);
        }

        &:hover:not(.active) {
          color: #cbd5e1;
        }
      }
    }

    .editor-ded-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;

      @media (max-width: 480px) {
        grid-template-columns: 1fr;
      }

      .ded-chip {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #090c13;
        border: 1px solid #242c3e;
        border-radius: 8px;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-muted);
        transition: all 0.15s ease;

        input[type="checkbox"] {
          accent-color: var(--danger);
          cursor: pointer;
        }

        &.checked {
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
        }
      }
    }

    .custom-ded-inline-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 8px;

      .custom-name-field {
        flex: 1;
        background: #090c13;
        border: 1px solid #242c3e;
        border-radius: 7px;
        color: #fff;
        font-size: 0.78rem;
        padding: 6px 10px;
        outline: none;
        &:focus { border-color: var(--accent); }
      }

      .custom-amt-field {
        display: flex;
        align-items: center;
        width: 110px;
        background: #090c13;
        border: 1px solid #242c3e;
        border-radius: 7px;
        padding: 0 8px;

        span {
          color: var(--danger);
          font-weight: 700;
          font-size: 0.78rem;
        }

        input {
          width: 100%;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 6px 4px;
          outline: none;
        }
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      background: #141926;
      border-top: 1px solid #1a2133;

      .btn {
        padding: 8px 16px;
        font-size: 0.82rem;
        font-weight: 700;
        border-radius: 8px;
        cursor: pointer;
      }
    }
  `],
})
export class CompareComponent implements OnDestroy {
  svc = inject(ValuationService);
  Math = Math;
  editingId = signal<string | null>(null);
  editingCarSnapshot = signal<CarSnapshot | null>(null);
  viewMode = signal<'cards' | 'table'>('cards');
  selectedCarIdsForRadar = signal<string[]>([]);
  isRecalculating = signal<boolean>(false);
  recalcNotice = signal<string | null>(null);
  private hasInitializedCarsSelection = false;

  @ViewChild('spiderCanvas') spiderCanvas?: ElementRef<HTMLCanvasElement>;
  chart?: Chart;

  getCarSpiderPrice(car: CarSnapshot): number {
    const s = this.svc.settings();
    let price = car.finalOffer;
    if (s.includeJuniperInSpiderPrice && car.needsJuniperSuspension && s.juniperSuspensionCost < 0) {
      price += Math.abs(s.juniperSuspensionCost);
    }
    return price;
  }

  allDimensions: RadarDimension[] = [
    {
      id: 'offer',
      label: 'Target Max Offer (Inverted: Lower Price = Higher Score)',
      shortLabel: 'Offer Price (Low)',
      icon: '💰',
      calc: (car, allCars) => {
        const carPrice = this.getCarSpiderPrice(car);
        if (!allCars || allCars.length <= 1) {
          const normalized = Math.min(38000, Math.max(18000, carPrice));
          return Math.round(95 - ((normalized - 18000) / 20000) * 70);
        }
        const prices = allCars.map((c) => this.getCarSpiderPrice(c));
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const diff = maxPrice - minPrice;
        if (diff < 100) return 70;
        // Inverted auto-scale: lowest offer price gets 95, highest offer price gets 25
        const fraction = (carPrice - minPrice) / diff;
        return Math.round(95 - fraction * 70);
      },
    },
    {
      id: 'deal_margin',
      label: 'Deal Margin (Asking vs Max Offer)',
      shortLabel: 'Deal Margin',
      icon: '🎯',
      calc: (car, allCars) => {
        const getGap = (c: CarSnapshot) =>
          c.askingPrice && c.askingPrice > 0 ? c.finalOffer - c.askingPrice : 0;
        const currentGap = getGap(car);

        if (!allCars || allCars.length <= 1) {
          return Math.min(100, Math.max(15, Math.round(60 + (currentGap / 4000) * 35)));
        }

        const gaps = allCars.map(getGap);
        const minGap = Math.min(...gaps);
        const maxGap = Math.max(...gaps);
        const diff = maxGap - minGap;
        if (diff < 200) {
          return Math.min(100, Math.max(15, Math.round(60 + (currentGap / 4000) * 35)));
        }
        // Auto-scale deal gaps across plotted cars: largest bargain gets 95, worst deal gets 25
        const fraction = (currentGap - minGap) / diff;
        return Math.round(25 + fraction * 70);
      },
    },
    {
      id: 'warranty',
      label: 'Battery Warranty Left',
      shortLabel: 'Warranty',
      icon: '🛡️',
      calc: (car) => Math.min(100, Math.max(0, Math.round((car.warrantyYears / 3.5) * 100))),
    },
    {
      id: 'mileage',
      label: 'Low Mileage (Odometer)',
      shortLabel: 'Low Mileage',
      icon: '🏎️',
      calc: (car) => Math.min(100, Math.max(10, Math.round(((190000 - car.currentKm) / 190000) * 100))),
    },
    {
      id: 'performance',
      label: 'Trim (Performance vs Long Range)',
      shortLabel: 'Performance',
      icon: '⚡',
      calc: (car) => (car.trim === 'Perf' ? 100 : 55),
    },
    {
      id: 'factory',
      label: 'Giga Berlin Build Origin',
      shortLabel: 'Giga Berlin',
      icon: '🏭',
      calc: (car) => (car.gigaBerlin ? 100 : 35),
    },
    {
      id: 'comfort',
      label: 'Ride Comfort (Juniper Suspension)',
      shortLabel: 'Suspension',
      icon: '🛋️',
      calc: (car) => (car.needsJuniperSuspension ? 100 : car.currentKm <= 40000 ? 65 : 35),
    },
    {
      id: 'autopilot',
      label: 'Autopilot Level (FSD/EAP/Basic)',
      shortLabel: 'Autopilot',
      icon: '🤖',
      calc: (car) => (car.apPkg === 'FSD' ? 100 : car.apPkg === 'EAP' ? 70 : 35),
    },
    {
      id: 'hardware',
      label: 'FSD Computer (HW4 vs HW3)',
      shortLabel: 'Hardware 4',
      icon: '📷',
      calc: (car) => (car.hwVer === 'HW4' ? 100 : 40),
    },
    {
      id: 'processor',
      label: 'MCU Processor (AMD Ryzen vs Atom)',
      shortLabel: 'AMD Ryzen',
      icon: '💻',
      calc: (car) => (car.proc === 'Ryzen' ? 100 : 20),
    },
    {
      id: 'wheels',
      label: 'Wheel Upgrade (21"/20"/19")',
      shortLabel: 'Wheels',
      icon: '🛞',
      calc: (car) => (car.wheels === '21' ? 100 : car.wheels === '20' ? 70 : 40),
    },
    {
      id: 'tyres',
      label: 'Tyres Package (2 Sets / All-Season)',
      shortLabel: 'Tyres & Winter',
      icon: '❄️',
      calc: (car) => (car.tires === 'both' ? 100 : car.tires === 'all_seasons' ? 65 : 30),
    },
    {
      id: 'tow_hitch',
      label: 'Factory Tow Hitch Equipped',
      shortLabel: 'Tow Hitch',
      icon: '🪝',
      calc: (car) => (car.towHitch ? 100 : 30),
    },
    {
      id: 'interior',
      label: 'White Premium Interior',
      shortLabel: 'White Interior',
      icon: '🪑',
      calc: (car) => (car.intColor === 'White' ? 100 : 45),
    },
    {
      id: 'paint',
      label: 'Metallic / Black Paint',
      shortLabel: 'Paint Colour',
      icon: '🎨',
      calc: (car) => (car.bodyColor === 'Other' ? 100 : 50),
    },
    {
      id: 'condition',
      label: 'Flawless Condition (Low Flaws)',
      shortLabel: 'Condition',
      icon: '✨',
      calc: (car) => Math.max(10, 100 - Math.round(car.totalDeductions / 20)),
    },
  ];

  selectedCategoryIds = signal<string[]>(this.loadSelectedCategories());

  colors = [
    { border: '#38bdf8', bg: 'rgba(56, 189, 248, 0.25)' }, // Sky Cyan
    { border: '#e11d48', bg: 'rgba(225, 29, 72, 0.25)' },  // Tesla Crimson
    { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.25)' },  // Emerald
    { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.25)' },  // Amber
    { border: '#a855f7', bg: 'rgba(168, 85, 247, 0.25)' },  // Purple
    { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.25)' },  // Hot Pink
    { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.25)' },   // Bright Cyan
    { border: '#f97316', bg: 'rgba(249, 115, 22, 0.25)' },  // Sunset Orange
    { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.25)' },  // Soft Violet
    { border: '#10b981', bg: 'rgba(16, 185, 129, 0.25)' },  // Mint Teal
    { border: '#eab308', bg: 'rgba(234, 179, 8, 0.25)' },   // Golden Yellow
    { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.25)' },  // Indigo
  ];

  constructor() {
    effect(() => {
      // Sync selected cars for radar whenever cars list changes
      const cars = this.svc.cars();
      const validCarIds = cars.map((c) => c.id);
      const currentSelected = this.selectedCarIdsForRadar();

      if (!this.hasInitializedCarsSelection) {
        if (validCarIds.length > 0) {
          this.selectedCarIdsForRadar.set(validCarIds);
          this.hasInitializedCarsSelection = true;
        }
      } else {
        const filtered = currentSelected.filter((id) => validCarIds.includes(id));
        if (filtered.length !== currentSelected.length) {
          this.selectedCarIdsForRadar.set(filtered);
        }
      }
    });

    effect(() => {
      // Re-render chart whenever cars list, active categories, or selected radar cars update
      const cars = this.svc.cars();
      const categories = this.selectedCategoryIds();
      const selectedCars = this.selectedCarIdsForRadar();
      setTimeout(() => this.renderChart(cars, categories, selectedCars), 0);
    });
  }

  isCarOnRadar(id: string): boolean {
    return this.selectedCarIdsForRadar().includes(id);
  }

  toggleCarRadar(id: string) {
    const current = this.selectedCarIdsForRadar();
    if (current.includes(id)) {
      this.selectedCarIdsForRadar.set(current.filter((c) => c !== id));
    } else {
      this.selectedCarIdsForRadar.set([...current, id]);
    }
  }

  selectAllCarsForRadar() {
    this.selectedCarIdsForRadar.set(this.svc.cars().map((c) => c.id));
  }

  uncheckAllCarsForRadar() {
    this.selectedCarIdsForRadar.set([]);
  }

  deselectAllCarsExceptFirst() {
    const first = this.svc.cars()[0];
    this.selectedCarIdsForRadar.set(first ? [first.id] : []);
  }

  hasConfigChangedForCars(): boolean {
    const cars = this.svc.cars();
    const s = this.svc.settings();
    return cars.some((car) => {
      const calc = this.svc.calculateCarOffer(car, s);
      return calc.finalOffer !== car.finalOffer || Math.abs(calc.warrantyYears - car.warrantyYears) > 0.01;
    });
  }

  recalculateCars() {
    this.isRecalculating.set(true);
    const count = this.svc.recalculateAllCars();
    setTimeout(() => {
      this.isRecalculating.set(false);
      const s = this.svc.settings();
      this.recalcNotice.set(
        `✓ Recalculated ${count} car${count === 1 ? '' : 's'} using current config settings (Base: €${s.basePriceAnchor.toLocaleString()}, Berlin: +€${s.gigaBerlinAdder.toLocaleString()}, Juniper: ${(s.juniperSuspensionCost >= 0 ? '+' : '-') + '€' + Math.abs(s.juniperSuspensionCost).toLocaleString()})`
      );
      setTimeout(() => {
        if (this.recalcNotice()?.startsWith('✓')) {
          this.recalcNotice.set(null);
        }
      }, 5000);
    }, 250);
  }

  isCatSelected(id: string): boolean {
    return this.selectedCategoryIds().includes(id);
  }

  toggleCategory(id: string) {
    const current = this.selectedCategoryIds();
    if (current.includes(id)) {
      const next = current.filter((c) => c !== id);
      this.selectedCategoryIds.set(next);
      this.saveSelectedCategories(next);
    } else {
      const next = [...current, id];
      this.selectedCategoryIds.set(next);
      this.saveSelectedCategories(next);
    }
  }

  selectAllCategories() {
    this.setPreset('all');
  }

  uncheckAllCategories() {
    this.selectedCategoryIds.set([]);
    this.saveSelectedCategories([]);
  }

  setPreset(preset: 'core' | 'all' | 'tech' | 'options' | 'value') {
    let ids: string[] = [];
    if (preset === 'core') {
      ids = ['offer', 'deal_margin', 'warranty', 'mileage', 'comfort', 'autopilot', 'processor'];
    } else if (preset === 'all') {
      ids = this.allDimensions.map((d) => d.id);
    } else if (preset === 'tech') {
      ids = ['hardware', 'processor', 'autopilot', 'comfort', 'factory', 'performance'];
    } else if (preset === 'options') {
      ids = ['wheels', 'tyres', 'tow_hitch', 'interior', 'paint', 'factory'];
    } else if (preset === 'value') {
      ids = ['offer', 'deal_margin', 'warranty', 'mileage', 'condition', 'factory'];
    }
    this.selectedCategoryIds.set(ids);
    this.saveSelectedCategories(ids);
  }

  startEditing(id: string) {
    this.editingId.set(id);
  }

  saveTitle(id: string, newTitle: string) {
    if (newTitle && newTitle.trim()) {
      this.svc.updateCarName(id, newTitle.trim());
    }
    this.editingId.set(null);
  }

  cancelEditing() {
    this.editingId.set(null);
  }

  getColor(index: number): string {
    return this.colors[index % this.colors.length].border;
  }

  formatAutopilot(ap?: string): string {
    if (ap === 'FSD') return 'Full Self-Driving (FSD)';
    if (ap === 'EAP') return 'Enhanced Autopilot (EAP)';
    return 'Basic Autopilot';
  }

  formatWheels(w?: string): string {
    if (w === '20') return '20" Induction Wheels';
    if (w === '21') return '21" Überturbine Wheels';
    return '19" Gemini Wheels';
  }

  formatTires(t?: string): string {
    if (t === 'both') return 'Summer + Extra Winter Set';
    if (t === 'all_seasons') return 'All-Season Tyres';
    return 'Summer Only (Winter Tyres Needed)';
  }

  getValueAdders(car: CarSnapshot): FeatureHighlight[] {
    const list: FeatureHighlight[] = [];
    const s = this.svc.settings();

    if (car.gigaBerlin) {
      list.push({ label: 'Giga Berlin Build', tag: `+€${s.gigaBerlinAdder.toLocaleString()}`, type: 'bonus' });
    }
    if (car.trim === 'Perf') {
      list.push({ label: 'Performance Trim', tag: `+€${s.perfAdder.toLocaleString()}`, type: 'bonus' });
    }
    if (car.needsJuniperSuspension) {
      const suspSign = s.juniperSuspensionCost >= 0 ? '+' : '-';
      const suspDesc = s.juniperSuspensionCost >= 0 ? '(Softer Ride)' : '(Offer discount)';
      list.push({
        label: 'Juniper Suspension Upgrade',
        tag: `${suspSign}€${Math.abs(s.juniperSuspensionCost).toLocaleString()} ${suspDesc}`,
        type: 'bonus',
      });
    }
    if (car.apPkg === 'FSD') {
      list.push({ label: 'Full Self-Driving (FSD)', tag: `+€${s.fsdAdder.toLocaleString()}`, type: 'bonus' });
    } else if (car.apPkg === 'EAP') {
      list.push({ label: 'Enhanced Autopilot (EAP)', tag: `+€${s.eapAdder.toLocaleString()}`, type: 'bonus' });
    }
    if (car.hwVer === 'HW4') {
      list.push({ label: 'Hardware 4 (HW4)', tag: `+€${s.hw4Adder.toLocaleString()}`, type: 'bonus' });
    }
    if (car.proc === 'Ryzen') {
      list.push({ label: 'AMD Ryzen Processor', tag: 'Fast MCU', type: 'bonus' });
    }
    if (car.wheels === '21') {
      list.push({ label: '21" Überturbine Wheels', tag: 'Included on Perf', type: 'bonus' });
    } else if (car.wheels === '20') {
      list.push({ label: '20" Induction Wheels', tag: `+€${s.wheels20Adder.toLocaleString()}`, type: 'bonus' });
    }
    if (car.tires === 'both') {
      list.push({ label: 'Summer + Extra Winter Set', tag: `+€${s.winterTireSetAdder.toLocaleString()}`, type: 'bonus' });
    }
    if (car.towHitch) {
      list.push({ label: 'Factory Tow Hitch', tag: `+€${s.towHitchAdder.toLocaleString()}`, type: 'bonus' });
    }
    if (car.intColor === 'White') {
      list.push({ label: 'White Premium Interior', tag: `+€${s.interiorAdder.toLocaleString()}`, type: 'bonus' });
    }
    if (car.bodyColor === 'Other') {
      list.push({ label: 'Metallic / Black Paint', tag: `+€${s.colorAdder.toLocaleString()}`, type: 'bonus' });
    }

    return list;
  }

  getMissingOrPenalties(car: CarSnapshot): FeatureHighlight[] {
    const list: FeatureHighlight[] = [];
    const s = this.svc.settings();

    // Factory origin
    if (!car.gigaBerlin) {
      list.push({ label: 'Shanghai / US Build', tag: 'Base Factory', type: 'missing' });
    }

    // Tyres
    if (car.tires === 'summer') {
      list.push({ label: 'Summer Tyres Only', tag: `-€${s.summerOnlyPenalty.toLocaleString()} (Needs Winter Set)`, type: 'penalty', isPenalty: true });
    }

    // Processor penalty
    if (car.proc === 'Atom') {
      list.push({ label: 'Intel Atom Legacy MCU', tag: `-€${s.atomPenalty.toLocaleString()} Penalty`, type: 'penalty', isPenalty: true });
    }

    // Suspension
    if (!car.needsJuniperSuspension) {
      list.push({ label: 'Stock Suspension', tag: 'Stiffer Pre-Refresh', type: 'missing' });
    }

    // Tow hitch
    if (!car.towHitch) {
      list.push({ label: 'No Tow Hitch', tag: 'Missing Hitch', type: 'missing' });
    }

    // Autopilot
    if (car.apPkg === 'Basic') {
      list.push({ label: 'Basic Autopilot Only', tag: 'No EAP / FSD', type: 'missing' });
    }

    // Itemized flaw & damage deductions
    if (car.deductionNotes && car.deductionNotes.length > 0) {
      for (const note of car.deductionNotes) {
        list.push({ label: note, tag: 'Deduction', type: 'defect', isDefect: true });
      }
    }

    return list;
  }

  loadCar(car: CarSnapshot) {
    this.svc.loadCarIntoCalculator(car);
  }

  openInPlaceEditor(car: CarSnapshot) {
    this.editingCarSnapshot.set({
      ...car,
      dedTires: car.dedTires !== undefined ? car.dedTires : (car.deductionNotes?.some((n) => n.includes('Tires')) ?? false),
      dedCurbrash: car.dedCurbrash !== undefined ? car.dedCurbrash : (car.deductionNotes?.some((n) => n.includes('Curb')) ?? false),
      dedBumper: car.dedBumper !== undefined ? car.dedBumper : (car.deductionNotes?.some((n) => n.includes('Bumper')) ?? false),
      dedWindshield: car.dedWindshield !== undefined ? car.dedWindshield : (car.deductionNotes?.some((n) => n.includes('Windshield')) ?? false),
      customDeduction: car.customDeduction || 0,
      customDeductionName: car.customDeductionName || '',
    });
  }

  closeInPlaceEditor() {
    this.editingCarSnapshot.set(null);
  }

  updateEditingField(field: keyof CarSnapshot, value: any) {
    const current = this.editingCarSnapshot();
    if (!current) return;

    if (field === 'currentKm' || field === 'askingPrice' || field === 'customDeduction') {
      value = parseFloat(value) || 0;
    }

    const updated: CarSnapshot = { ...current, [field]: value };

    const totalDeductions =
      (updated.dedTires ? 900 : 0) +
      (updated.dedCurbrash ? 300 : 0) +
      (updated.dedBumper ? 450 : 0) +
      (updated.dedWindshield ? 350 : 0) +
      (Number(updated.customDeduction) || 0);
    updated.totalDeductions = totalDeductions;

    const calc = this.svc.calculateCarOffer(updated);
    updated.finalOffer = calc.finalOffer;
    updated.warrantyYears = calc.warrantyYears;
    updated.remainingKm = calc.remainingKm;

    this.editingCarSnapshot.set(updated);
  }

  adjustEditingKm(delta: number) {
    const current = this.editingCarSnapshot();
    if (!current) return;
    const next = Math.max(0, (current.currentKm || 0) + delta);
    this.updateEditingField('currentKm', next);
  }

  saveInPlaceEdits() {
    const current = this.editingCarSnapshot();
    if (!current) return;
    this.svc.updateCar(current.id, current);
    this.editingCarSnapshot.set(null);
    this.recalcNotice.set(`✓ Updated "${current.name}" in place!`);
    setTimeout(() => {
      if (this.recalcNotice()?.startsWith('✓ Updated')) {
        this.recalcNotice.set(null);
      }
    }, 4000);
  }

  renderChart(cars: CarSnapshot[], activeCategoryIds: string[], selectedCarIds: string[]) {
    if (!this.spiderCanvas?.nativeElement || cars.length === 0) {
      if (this.chart) {
        this.chart.destroy();
        this.chart = undefined;
      }
      return;
    }

    const carsToPlot = cars.filter((c) => selectedCarIds.includes(c.id));
    if (carsToPlot.length === 0) {
      if (this.chart) {
        this.chart.destroy();
        this.chart = undefined;
      }
      return;
    }

    const ctx = this.spiderCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const activeDimensions = this.allDimensions.filter((d) =>
      activeCategoryIds.includes(d.id)
    );
    if (activeDimensions.length < 3) {
      if (this.chart) {
        this.chart.destroy();
        this.chart = undefined;
      }
      return;
    }
    const labels = activeDimensions.map((d) => d.shortLabel);

    const datasets = carsToPlot.map((car) => {
      const originalIdx = cars.findIndex((c) => c.id === car.id);
      const col = this.colors[(originalIdx >= 0 ? originalIdx : 0) % this.colors.length];
      const data = activeDimensions.map((dim) => dim.calc(car, carsToPlot));

      return {
        label: car.name,
        data,
        backgroundColor: col.bg,
        borderColor: col.border,
        borderWidth: 2,
        pointBackgroundColor: col.border,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: col.border,
      };
    });

    this.chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: '#242c3f' },
            grid: { color: '#242c3f' },
            pointLabels: {
              color: '#94a3b8',
              font: { size: 11, weight: 'bold' },
            },
            ticks: {
              display: false,
              backdropColor: 'transparent',
              stepSize: 20,
            },
            suggestedMin: 0,
            suggestedMax: 100,
          },
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#f1f5f9',
              boxWidth: 14,
              font: { size: 12, weight: 'bold' },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const car = carsToPlot[ctx.datasetIndex];
                const dim = activeDimensions[ctx.dataIndex];
                const val = ctx.raw;
                if (dim?.id === 'offer' && car) {
                  const s = this.svc.settings();
                  const spiderPrice = this.getCarSpiderPrice(car);
                  const isRetrofitAdded =
                    s.includeJuniperInSpiderPrice &&
                    car.needsJuniperSuspension &&
                    s.juniperSuspensionCost < 0;
                  const priceDesc = isRetrofitAdded
                    ? `Offer €${car.finalOffer.toLocaleString()} + €${Math.abs(s.juniperSuspensionCost).toLocaleString()} retrofit = €${spiderPrice.toLocaleString()} all-in`
                    : `Offer €${car.finalOffer.toLocaleString()}`;
                  return ` ${ctx.dataset.label}: ${priceDesc} (Score: ${val}/100 — Lower price ranks higher)`;
                }
                if (dim?.id === 'deal_margin' && car) {
                  if (car.askingPrice && car.askingPrice > 0) {
                    const gap = car.finalOffer - car.askingPrice;
                    const gapText = gap >= 0 ? `+€${gap.toLocaleString()} (Bargain)` : `-€${Math.abs(gap).toLocaleString()} (Overpriced)`;
                    return ` ${ctx.dataset.label}: Asking €${car.askingPrice.toLocaleString()} vs Offer €${car.finalOffer.toLocaleString()} [${gapText}, score: ${val}/100]`;
                  }
                  return ` ${ctx.dataset.label}: Asking price not set (neutral score: ${val}/100)`;
                }
                return ` ${ctx.dataset.label}: ${val}/100`;
              },
            },
          },
        },
      },
    });
  }

  private loadSelectedCategories(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_RADAR_CATEGORIES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          const validIds = this.allDimensions.map((d) => d.id);
          const filtered = parsed.filter((id) => validIds.includes(id));
          if (!filtered.includes('deal_margin') && filtered.includes('offer')) {
            filtered.splice(filtered.indexOf('offer') + 1, 0, 'deal_margin');
          }
          if (filtered.length >= 3) {
            return filtered;
          }
        }
      }
    } catch {
      // fallback
    }
    return this.allDimensions.map((d) => d.id);
  }

  private saveSelectedCategories(ids: string[]) {
    try {
      localStorage.setItem(STORAGE_RADAR_CATEGORIES, JSON.stringify(ids));
    } catch {
      // ignore
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
