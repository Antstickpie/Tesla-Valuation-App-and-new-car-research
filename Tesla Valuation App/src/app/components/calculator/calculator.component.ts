import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ValuationService } from '../../services/valuation.service';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="calc-layout">
      <!-- Left Side: Configurator -->
      <div class="calc-left">
        <!-- Vehicle Specifications Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Vehicle Specifications</h2>
              <span class="card-subtitle">Select configuration & equipment</span>
            </div>
          </div>

          <!-- Listing Identification & Asking Price Row -->
          <div class="header-inputs-grid">
            <!-- Car Title Input -->
            <div class="form-group title-section">
              <div class="title-label-row">
                <label for="carTitle">Car Title / Listing Name</label>
                <span class="label-hint">Sets name in comparison</span>
              </div>
              <input
                type="text"
                id="carTitle"
                class="car-title-input"
                [ngModel]="svc.currentCarTitle()"
                (ngModelChange)="svc.currentCarTitle.set($event)"
                placeholder="e.g. 2022 LR Munich, Black Perf on AutoScout..."
                maxlength="60"
              />
            </div>

            <!-- Seller Asking Price Input -->
            <div class="form-group asking-section">
              <div class="title-label-row">
                <label for="askingPrice">Seller Asking Price</label>
                <span class="label-hint">For Spider & deal gap</span>
              </div>
              <div class="input-with-currency">
                <span class="currency-tag">€</span>
                <input
                  type="number"
                  id="askingPrice"
                  class="asking-price-input"
                  [ngModel]="svc.inputs().askingPrice || null"
                  (ngModelChange)="updateInput('askingPrice', $event)"
                  placeholder="e.g. 29,500"
                  step="250"
                  min="0"
                />
              </div>
            </div>
          </div>

          <!-- Mileage Row -->
          <div class="form-group mileage-section">
            <div class="mileage-label-row">
              <label for="currentKm">Current Mileage (KM)</label>
              <span class="mileage-display">{{ svc.inputs().currentKm.toLocaleString() }} km</span>
            </div>
            <div class="mileage-input-row">
              <div class="input-with-unit">
                <input
                  type="number"
                  id="currentKm"
                  [ngModel]="svc.inputs().currentKm"
                  (ngModelChange)="updateInput('currentKm', $event)"
                  step="1000"
                  min="0"
                />
                <span class="unit-tag">km</span>
              </div>
              <div class="quick-adjust-buttons">
                <button type="button" class="quick-btn" (click)="adjustKm(-10000)">-10k</button>
                <button type="button" class="quick-btn" (click)="adjustKm(10000)">+10k</button>
                <button type="button" class="quick-btn" (click)="setKm(160000)">160k (Base)</button>
              </div>
            </div>
          </div>

          <!-- Options Grid -->
          <div class="options-grid">
            <!-- Model Trim -->
            <div class="option-item">
              <label>Model Trim</label>
              <div class="segmented">
                <input
                  type="radio"
                  name="trim"
                  id="trim_lr"
                  value="LR"
                  [checked]="svc.inputs().trim === 'LR'"
                  (change)="updateInput('trim', 'LR')"
                />
                <label for="trim_lr" [class.active]="svc.inputs().trim === 'LR'">
                  <span class="opt-title">Long Range</span>
                  <span class="opt-desc">Baseline</span>
                </label>

                <input
                  type="radio"
                  name="trim"
                  id="trim_perf"
                  value="Perf"
                  [checked]="svc.inputs().trim === 'Perf'"
                  (change)="updateInput('trim', 'Perf')"
                />
                <label for="trim_perf" [class.active]="svc.inputs().trim === 'Perf'">
                  <span class="opt-title">Performance</span>
                  <span class="opt-desc pos">+€{{ svc.settings().perfAdder.toLocaleString() }}</span>
                </label>
              </div>
            </div>

            <!-- Wheels Selection -->
            <div class="option-item">
              <label>Wheels</label>
              <div class="segmented">
                <input
                  type="radio"
                  name="wheels"
                  id="wheel_19"
                  value="19"
                  [checked]="svc.inputs().wheels === '19'"
                  (change)="updateInput('wheels', '19')"
                />
                <label for="wheel_19" [class.active]="svc.inputs().wheels === '19'">
                  <span class="opt-title">19" Gemini</span>
                  <span class="opt-desc">Base</span>
                </label>

                <input
                  type="radio"
                  name="wheels"
                  id="wheel_20"
                  value="20"
                  [checked]="svc.inputs().wheels === '20'"
                  (change)="updateInput('wheels', '20')"
                />
                <label for="wheel_20" [class.active]="svc.inputs().wheels === '20'">
                  <span class="opt-title">20" Induction</span>
                  <span class="opt-desc pos">+€{{ svc.settings().wheels20Adder.toLocaleString() }}</span>
                </label>

                <input
                  type="radio"
                  name="wheels"
                  id="wheel_21"
                  value="21"
                  [checked]="svc.inputs().wheels === '21'"
                  (change)="updateInput('wheels', '21')"
                />
                <label for="wheel_21" [class.active]="svc.inputs().wheels === '21'">
                  <span class="opt-title">21" Überturbine</span>
                  <span class="opt-desc">Perf</span>
                </label>
              </div>
            </div>

            <!-- Tyres Selection -->
            <div class="option-item">
              <label>Tyres & Sets</label>
              <div class="segmented">
                <input
                  type="radio"
                  name="tires"
                  id="tire_summer"
                  value="summer"
                  [checked]="svc.inputs().tires === 'summer'"
                  (change)="updateInput('tires', 'summer')"
                />
                <label for="tire_summer" [class.active]="svc.inputs().tires === 'summer'">
                  <span class="opt-title">Summer Only</span>
                  <span class="opt-desc neg">-€{{ svc.settings().summerOnlyPenalty.toLocaleString() }}</span>
                </label>

                <input
                  type="radio"
                  name="tires"
                  id="tire_all_seasons"
                  value="all_seasons"
                  [checked]="svc.inputs().tires === 'all_seasons'"
                  (change)="updateInput('tires', 'all_seasons')"
                />
                <label for="tire_all_seasons" [class.active]="svc.inputs().tires === 'all_seasons'">
                  <span class="opt-title">All Seasons</span>
                  <span class="opt-desc">Neutral</span>
                </label>

                <input
                  type="radio"
                  name="tires"
                  id="tire_both"
                  value="both"
                  [checked]="svc.inputs().tires === 'both'"
                  (change)="updateInput('tires', 'both')"
                />
                <label for="tire_both" [class.active]="svc.inputs().tires === 'both'">
                  <span class="opt-title">Both Sets</span>
                  <span class="opt-desc pos">+€{{ svc.settings().winterTireSetAdder.toLocaleString() }}</span>
                </label>
              </div>
            </div>

            <!-- Needs Juniper Suspension? -->
            <div class="option-item">
              <label>
                <span>Needs Juniper Suspension?</span>
                <span class="label-info">Softer Ride</span>
              </label>
              <div class="segmented">
                <input
                  type="radio"
                  name="juniper_suspension"
                  id="susp_no"
                  [value]="false"
                  [checked]="!svc.inputs().needsJuniperSuspension"
                  (change)="updateInput('needsJuniperSuspension', false)"
                />
                <label for="susp_no" [class.active]="!svc.inputs().needsJuniperSuspension">
                  <span class="opt-title">No (Stock)</span>
                  <span class="opt-desc">Stiffer</span>
                </label>

                <input
                  type="radio"
                  name="juniper_suspension"
                  id="susp_yes"
                  [value]="true"
                  [checked]="svc.inputs().needsJuniperSuspension"
                  (change)="updateInput('needsJuniperSuspension', true)"
                />
                <label for="susp_yes" [class.active]="svc.inputs().needsJuniperSuspension">
                  <span class="opt-title">Yes (Soft Retrofit)</span>
                  <span class="opt-desc" [class.pos]="svc.settings().juniperSuspensionCost >= 0" [class.neg]="svc.settings().juniperSuspensionCost < 0">
                    {{ svc.settings().juniperSuspensionCost >= 0 ? '+' : '-' }}€{{ Math.abs(svc.settings().juniperSuspensionCost).toLocaleString() }}
                  </span>
                </label>
              </div>
            </div>

            <!-- Giga Berlin Built? -->
            <div class="option-item">
              <label>
                <span>Giga Berlin Built?</span>
                <span class="label-info">Factory Build</span>
              </label>
              <div class="segmented">
                <input
                  type="radio"
                  name="giga_berlin"
                  id="berlin_no"
                  [value]="false"
                  [checked]="!svc.inputs().gigaBerlin"
                  (change)="updateInput('gigaBerlin', false)"
                />
                <label for="berlin_no" [class.active]="!svc.inputs().gigaBerlin">
                  <span class="opt-title">No (Base)</span>
                  <span class="opt-desc">Shanghai/US</span>
                </label>

                <input
                  type="radio"
                  name="giga_berlin"
                  id="berlin_yes"
                  [value]="true"
                  [checked]="svc.inputs().gigaBerlin"
                  (change)="updateInput('gigaBerlin', true)"
                />
                <label for="berlin_yes" [class.active]="svc.inputs().gigaBerlin">
                  <span class="opt-title">Yes, Giga Berlin</span>
                  <span class="opt-desc pos">+€{{ svc.settings().gigaBerlinAdder.toLocaleString() }}</span>
                </label>
              </div>
            </div>

            <!-- Trailer Coupling / Tow Hitch -->
            <div class="option-item">
              <label>Trailer Coupling (Tow Hitch)</label>
              <div class="segmented">
                <input
                  type="radio"
                  name="tow_hitch"
                  id="tow_no"
                  [value]="false"
                  [checked]="!svc.inputs().towHitch"
                  (change)="updateInput('towHitch', false)"
                />
                <label for="tow_no" [class.active]="!svc.inputs().towHitch">
                  <span class="opt-title">No Hitch</span>
                  <span class="opt-desc">Base</span>
                </label>

                <input
                  type="radio"
                  name="tow_hitch"
                  id="tow_yes"
                  [value]="true"
                  [checked]="svc.inputs().towHitch"
                  (change)="updateInput('towHitch', true)"
                />
                <label for="tow_yes" [class.active]="svc.inputs().towHitch">
                  <span class="opt-title">Tow Hitch</span>
                  <span class="opt-desc pos">+€{{ svc.settings().towHitchAdder.toLocaleString() }}</span>
                </label>
              </div>
            </div>

            <!-- Autopilot Package -->
            <div class="option-item">
              <label>Autopilot Package</label>
              <div class="segmented">
                <input
                  type="radio"
                  name="ap_pkg"
                  id="ap_basic"
                  value="Basic"
                  [checked]="svc.inputs().apPkg === 'Basic'"
                  (change)="updateInput('apPkg', 'Basic')"
                />
                <label for="ap_basic" [class.active]="svc.inputs().apPkg === 'Basic'">
                  <span class="opt-title">Basic AP</span>
                  <span class="opt-desc">Base</span>
                </label>

                <input
                  type="radio"
                  name="ap_pkg"
                  id="ap_eap"
                  value="EAP"
                  [checked]="svc.inputs().apPkg === 'EAP'"
                  (change)="updateInput('apPkg', 'EAP')"
                />
                <label for="ap_eap" [class.active]="svc.inputs().apPkg === 'EAP'">
                  <span class="opt-title">EAP</span>
                  <span class="opt-desc pos">+€{{ svc.settings().eapAdder.toLocaleString() }}</span>
                </label>

                <input
                  type="radio"
                  name="ap_pkg"
                  id="ap_fsd"
                  value="FSD"
                  [checked]="svc.inputs().apPkg === 'FSD'"
                  (change)="updateInput('apPkg', 'FSD')"
                />
                <label for="ap_fsd" [class.active]="svc.inputs().apPkg === 'FSD'">
                  <span class="opt-title">FSD</span>
                  <span class="opt-desc pos">+€{{ svc.settings().fsdAdder.toLocaleString() }}</span>
                </label>
              </div>
            </div>

            <!-- Hardware Version -->
            <div class="option-item">
              <label>FSD Computer Hardware</label>
              <div class="segmented">
                <input
                  type="radio"
                  name="hw_ver"
                  id="hw_3"
                  value="HW3"
                  [checked]="svc.inputs().hwVer === 'HW3'"
                  (change)="updateInput('hwVer', 'HW3')"
                />
                <label for="hw_3" [class.active]="svc.inputs().hwVer === 'HW3'">
                  <span class="opt-title">HW3</span>
                  <span class="opt-desc">Base</span>
                </label>

                <input
                  type="radio"
                  name="hw_ver"
                  id="hw_4"
                  value="HW4"
                  [checked]="svc.inputs().hwVer === 'HW4'"
                  (change)="updateInput('hwVer', 'HW4')"
                />
                <label for="hw_4" [class.active]="svc.inputs().hwVer === 'HW4'">
                  <span class="opt-title">HW4</span>
                  <span class="opt-desc pos">+€{{ svc.settings().hw4Adder.toLocaleString() }}</span>
                </label>
              </div>
            </div>

            <!-- Processor -->
            <div class="option-item">
              <label>Processor (MCU)</label>
              <div class="segmented">
                <input
                  type="radio"
                  name="mcu_proc"
                  id="proc_ryzen"
                  value="Ryzen"
                  [checked]="svc.inputs().proc === 'Ryzen'"
                  (change)="updateInput('proc', 'Ryzen')"
                />
                <label for="proc_ryzen" [class.active]="svc.inputs().proc === 'Ryzen'">
                  <span class="opt-title">AMD Ryzen</span>
                  <span class="opt-desc">Base</span>
                </label>

                <input
                  type="radio"
                  name="mcu_proc"
                  id="proc_atom"
                  value="Atom"
                  [checked]="svc.inputs().proc === 'Atom'"
                  (change)="updateInput('proc', 'Atom')"
                />
                <label for="proc_atom" [class.active]="svc.inputs().proc === 'Atom'">
                  <span class="opt-title">Intel Atom</span>
                  <span class="opt-desc neg">-€{{ svc.settings().atomPenalty.toLocaleString() }}</span>
                </label>
              </div>
            </div>

            <!-- Body Colour -->
            <div class="option-item">
              <label>Body Colour</label>
              <div class="segmented">
                <input
                  type="radio"
                  name="color_body"
                  id="color_white"
                  value="White"
                  [checked]="svc.inputs().bodyColor === 'White'"
                  (change)="updateInput('bodyColor', 'White')"
                />
                <label for="color_white" [class.active]="svc.inputs().bodyColor === 'White'">
                  <span class="opt-title">Pearl White</span>
                  <span class="opt-desc">Base</span>
                </label>

                <input
                  type="radio"
                  name="color_body"
                  id="color_other"
                  value="Other"
                  [checked]="svc.inputs().bodyColor === 'Other'"
                  (change)="updateInput('bodyColor', 'Other')"
                />
                <label for="color_other" [class.active]="svc.inputs().bodyColor === 'Other'">
                  <span class="opt-title">Black / Metallic</span>
                  <span class="opt-desc pos">+€{{ svc.settings().colorAdder.toLocaleString() }}</span>
                </label>
              </div>
            </div>

            <!-- Interior Colour -->
            <div class="option-item">
              <label>Interior Colour</label>
              <div class="segmented">
                <input
                  type="radio"
                  name="color_interior"
                  id="int_black"
                  value="Black"
                  [checked]="svc.inputs().intColor === 'Black'"
                  (change)="updateInput('intColor', 'Black')"
                />
                <label for="int_black" [class.active]="svc.inputs().intColor === 'Black'">
                  <span class="opt-title">All Black</span>
                  <span class="opt-desc">Base</span>
                </label>

                <input
                  type="radio"
                  name="color_interior"
                  id="int_white"
                  value="White"
                  [checked]="svc.inputs().intColor === 'White'"
                  (change)="updateInput('intColor', 'White')"
                />
                <label for="int_white" [class.active]="svc.inputs().intColor === 'White'">
                  <span class="opt-title">White Premium</span>
                  <span class="opt-desc pos">+€{{ svc.settings().interiorAdder.toLocaleString() }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Deductions Card -->
        <div class="card deductions-card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Condition Deductions</h2>
              <span class="card-subtitle">Flaws, worn parts & repair discounts to negotiate</span>
            </div>
          </div>

          <div class="deductions-list">
            <label class="deduction-row" [class.checked]="svc.inputs().dedTires">
              <div class="ded-left">
                <input
                  type="checkbox"
                  [checked]="svc.inputs().dedTires"
                  (change)="updateInput('dedTires', $any($event.target).checked)"
                />
                <div class="ded-info">
                  <span class="ded-name">Worn / 2-3mm Tires Replacement</span>
                  <span class="ded-sub">Full 4-tire replacement budget</span>
                </div>
              </div>
              <span class="ded-badge">-€900</span>
            </label>

            <label class="deduction-row" [class.checked]="svc.inputs().dedCurbrash">
              <div class="ded-left">
                <input
                  type="checkbox"
                  [checked]="svc.inputs().dedCurbrash"
                  (change)="updateInput('dedCurbrash', $any($event.target).checked)"
                />
                <div class="ded-info">
                  <span class="ded-name">Curb Rash on Wheels</span>
                  <span class="ded-sub">Rim refurbishment / alloy repair</span>
                </div>
              </div>
              <span class="ded-badge">-€300</span>
            </label>

            <label class="deduction-row" [class.checked]="svc.inputs().dedBumper">
              <div class="ded-left">
                <input
                  type="checkbox"
                  [checked]="svc.inputs().dedBumper"
                  (change)="updateInput('dedBumper', $any($event.target).checked)"
                />
                <div class="ded-info">
                  <span class="ded-name">Scratched / Peeling Front Bumper</span>
                  <span class="ded-sub">Partial respray & clearcoat blend</span>
                </div>
              </div>
              <span class="ded-badge">-€450</span>
            </label>

            <label class="deduction-row" [class.checked]="svc.inputs().dedWindshield">
              <div class="ded-left">
                <input
                  type="checkbox"
                  [checked]="svc.inputs().dedWindshield"
                  (change)="updateInput('dedWindshield', $any($event.target).checked)"
                />
                <div class="ded-info">
                  <span class="ded-name">Windshield Wiper Scratch / Stone Chip</span>
                  <span class="ded-sub">Glass polishing or insurance deductible</span>
                </div>
              </div>
              <span class="ded-badge">-€350</span>
            </label>

            <div class="custom-ded-card">
              <label class="custom-ded-title">Other Custom Deduction</label>
              <div class="custom-inputs-flex">
                <input
                  type="text"
                  class="custom-name-input"
                  [ngModel]="svc.inputs().customDeductionName"
                  (ngModelChange)="updateInput('customDeductionName', $event)"
                  placeholder="Deduction reason / name (e.g. Door ding, torn seat...)"
                  maxlength="50"
                />
                <div class="custom-amount-wrap">
                  <span class="currency-tag">€</span>
                  <input
                    type="number"
                    id="customDeduction"
                    class="custom-amount-input"
                    [ngModel]="svc.inputs().customDeduction"
                    (ngModelChange)="updateInput('customDeduction', $event)"
                    placeholder="0"
                    step="50"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Side: Valuation Dashboard (Sticky on laptop screens) -->
      <div class="calc-right">
        <!-- Valuation Result Card -->
        <div class="card result-card">
          <div class="result-header">
            <span class="result-title">Maximum Willing-To-Pay</span>
            <div class="result-value">€{{ svc.finalOffer().toLocaleString() }}</div>
            <div class="result-meta">
              <span class="base-ref">Baseline: €{{ svc.settings().basePriceAnchor.toLocaleString() }}</span>
              <span class="delta-tag" [class.pos]="svc.totalDeltas() >= 0" [class.neg]="svc.totalDeltas() < 0">
                {{ svc.totalDeltas() >= 0 ? '+' : '' }}€{{ Math.round(svc.totalDeltas()).toLocaleString() }}
              </span>
            </div>
          </div>

          <!-- Deal Gap / Price Comparison (when asking price is entered) -->
          @if (svc.inputs().askingPrice && svc.inputs().askingPrice! > 0) {
            <div
              class="deal-gap-banner"
              [class.deal-good]="svc.finalOffer() >= svc.inputs().askingPrice!"
              [class.deal-bad]="svc.finalOffer() < svc.inputs().askingPrice!"
            >
              <div class="deal-gap-head">
                <span class="deal-gap-tag">
                  {{ svc.finalOffer() >= svc.inputs().askingPrice! ? '🎯 BARGAIN (UNDER OFFER)' : '⚠️ ASKING EXCEEDS OFFER' }}
                </span>
                <span class="deal-gap-val font-mono">
                  {{ svc.finalOffer() >= svc.inputs().askingPrice! ? '+€' + (svc.finalOffer() - svc.inputs().askingPrice!).toLocaleString() : '-€' + (svc.inputs().askingPrice! - svc.finalOffer()).toLocaleString() }}
                </span>
              </div>
              <div class="deal-gap-desc">
                Asking €{{ svc.inputs().askingPrice!.toLocaleString() }} vs your €{{ svc.finalOffer().toLocaleString() }} max willingness-to-pay
                ({{ svc.finalOffer() >= svc.inputs().askingPrice! ? '€' + (svc.finalOffer() - svc.inputs().askingPrice!).toLocaleString() + ' negotiation margin' : '€' + (svc.inputs().askingPrice! - svc.finalOffer()).toLocaleString() + ' above calculated value' }}).
              </div>
            </div>
          }

          <!-- Warranty Status -->
          <div class="warranty-block">
            <div class="warranty-meta">
              <div class="warranty-title">
                <span>Drivetrain & Battery</span>
                <span class="warranty-cap">190k km cap</span>
              </div>
              <span class="warranty-badge" [ngClass]="svc.warrantyStatus().badgeClass">
                {{ svc.warrantyStatus().badgeText }}
              </span>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                [style.width]="svc.warrantyStatus().barWidth"
                [style.background]="svc.warrantyStatus().barBg"
              ></div>
            </div>
            <div class="warranty-stats">
              <span>{{ svc.warrantyStatus().kmLeftText }}</span>
              <span>{{ svc.warrantyStatus().yearsCalcText }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="result-actions">
            <button class="btn btn-primary" (click)="copyOffer()">
              <span class="btn-emoji">📋</span>
              <span>Copy Offer Text</span>
            </button>
            <button class="btn btn-secondary" (click)="saveCar()">
              <span class="btn-emoji">💾</span>
              <span>Save to Compare ({{ svc.cars().length }})</span>
            </button>
          </div>
        </div>

        <!-- Itemized Breakdown Card -->
        <div class="card breakdown-card">
          <div class="card-header compact">
            <h3 class="card-title">Calculation Breakdown</h3>
          </div>

          <div class="breakdown-items">
            <div class="breakdown-row base-row">
              <span class="b-label">Baseline Reference ({{ svc.settings().baseKm / 1000 }}k km LR)</span>
              <span class="b-val base-val">€{{ svc.settings().basePriceAnchor.toLocaleString() }}</span>
            </div>

            @for (d of svc.deltas(); track d.item) {
              <div class="breakdown-row" [class.zero-row]="d.val === 0">
                <span class="b-label">{{ d.item }}</span>
                <span
                  class="b-val"
                  [class.pos-val]="d.val > 0"
                  [class.neg-val]="d.val < 0"
                  [class.muted-val]="d.val === 0"
                >
                  {{ d.val === 0 ? '€0' : (d.val > 0 ? '+' : '') + '€' + Math.round(d.val).toLocaleString() }}
                </span>
              </div>
            }

            <div class="breakdown-row total-row">
              <span class="b-label">Final Target Offer</span>
              <span class="b-val total-val">€{{ svc.finalOffer().toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calc-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      width: 100%;
      box-sizing: border-box;

      @media (min-width: 992px) {
        grid-template-columns: minmax(0, 1.28fr) minmax(360px, 0.92fr);
        gap: 20px;
        align-items: start;
      }

      @media (min-width: 1600px) {
        grid-template-columns: minmax(0, 1.38fr) minmax(420px, 0.92fr);
        gap: 24px;
      }
    }

    .calc-left {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
      width: 100%;
    }

    .calc-right {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
      width: 100%;

      @media (min-width: 992px) {
        position: sticky;
        top: 16px;
      }
    }

    .card-header {
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      &.compact {
        margin-bottom: 8px;
      }

      .card-title {
        font-size: 1.05rem;
        font-weight: 700;
        color: #fff;
        margin: 0;
      }

      .card-subtitle {
        font-size: 0.78rem;
        color: var(--text-muted);
        display: block;
        margin-top: 2px;
      }
    }

    /* Header Inputs Grid (Title + Asking Price) */
    .header-inputs-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 14px;

      @media (min-width: 600px) {
        grid-template-columns: minmax(0, 1.35fr) minmax(180px, 0.95fr);
      }

      .title-section, .asking-section {
        margin-bottom: 0;
      }
    }

    .title-label-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 6px;

      label {
        margin-bottom: 0;
      }

      .label-hint {
        font-size: 0.7rem;
        color: var(--text-dim);
      }
    }

    .input-with-currency {
      position: relative;
      width: 100%;

      .currency-tag {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.95rem;
        font-weight: 750;
        color: var(--accent);
        pointer-events: none;
      }

      input.asking-price-input {
        padding-left: 28px;
        font-family: ui-monospace, SFMono-Regular, monospace;
      }
    }

    /* Mileage section */
    .mileage-section {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 16px;
    }

    .mileage-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      label {
        margin-bottom: 0;
      }

      .mileage-display {
        font-family: ui-monospace, monospace;
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--accent);
      }
    }

    .mileage-input-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }

    .input-with-unit {
      position: relative;
      flex: 1;
      min-width: 180px;

      input {
        width: 100%;
        padding-right: 44px;
      }

      .unit-tag {
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-muted);
        pointer-events: none;
      }
    }

    .quick-adjust-buttons {
      display: flex;
      gap: 6px;

      .quick-btn {
        background: #1e2436;
        border: 1px solid var(--card-border);
        color: var(--text-muted);
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;

        &:hover {
          background: #2a334c;
          color: #fff;
        }

        &:active {
          transform: translateY(1px);
        }
      }
    }

    /* Options 2-column responsive grid */
    .options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }

    .option-item {
      min-width: 0;

      label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.76rem;
        font-weight: 700;
        color: var(--text-muted);
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.04em;

        .label-info {
          font-size: 0.7rem;
          color: var(--accent);
          background: rgba(56, 189, 248, 0.12);
          padding: 1px 6px;
          border-radius: 4px;
          text-transform: none;
        }
      }
    }

    /* Segmented selector */
    .segmented {
      display: flex;
      background: #0d1017;
      border: 1px solid #20273a;
      border-radius: 10px;
      padding: 3px;
      gap: 3px;
      width: 100%;
      box-sizing: border-box;

      input[type="radio"] {
        display: none;
      }

      label {
        flex: 1 1 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 7px 6px;
        margin: 0;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.15s ease;
        user-select: none;
        line-height: 1.25;

        .opt-title {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .opt-desc {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 600;
          margin-top: 1px;

          &.pos { color: var(--success); }
          &.neg { color: var(--danger); }
        }

        &:hover:not(.active) {
          background: #171d2b;
        }

        &.active {
          background: var(--primary);
          box-shadow: 0 2px 8px rgba(225, 29, 72, 0.45);

          .opt-title {
            color: #fff;
          }

          .opt-desc {
            color: rgba(255, 255, 255, 0.9);
            &.pos, &.neg { color: #fff; }
          }
        }
      }
    }

    /* Deductions list */
    .deductions-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;

      @media (min-width: 1200px) {
        grid-template-columns: 1fr 1fr;

        .custom-ded-card {
          grid-column: 1 / -1;
        }
      }
    }

    .deduction-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f121a;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 10px 14px;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #151a26;
        border-color: #2e3852;
      }

      &.checked {
        border-color: rgba(239, 68, 68, 0.4);
        background: rgba(239, 68, 68, 0.06);
      }

      .ded-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--danger);
          cursor: pointer;
          flex-shrink: 0;
        }

        .ded-info {
          display: flex;
          flex-direction: column;
          min-width: 0;

          .ded-name {
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--text);
          }

          .ded-sub {
            font-size: 0.72rem;
            color: var(--text-muted);
            margin-top: 1px;
          }
        }
      }

      .ded-badge {
        font-family: ui-monospace, monospace;
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--danger);
        background: var(--danger-bg);
        border: 1px solid rgba(239, 68, 68, 0.25);
        padding: 3px 8px;
        border-radius: 6px;
        white-space: nowrap;
        margin-left: 8px;
      }
    }

    .custom-ded-card {
      background: #0f121a;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 10px 14px;
      margin-top: 4px;

      .custom-ded-title {
        display: block;
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 6px;
      }

      .custom-inputs-flex {
        display: flex;
        gap: 8px;
        align-items: center;

        .custom-name-input {
          flex: 1;
          min-width: 0;
          background: #090c13;
          border: 1px solid #242c3e;
          border-radius: 8px;
          color: #fff;
          font-size: 0.84rem;
          padding: 7px 10px;
          outline: none;

          &:focus {
            border-color: var(--accent);
          }
        }

        .custom-amount-wrap {
          position: relative;
          width: 120px;
          flex-shrink: 0;

          .currency-tag {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            font-weight: 700;
            font-size: 0.85rem;
          }

          .custom-amount-input {
            width: 100%;
            padding: 7px 8px 7px 24px;
            font-size: 0.95rem;
            font-family: ui-monospace, monospace;
            background: #090c13;
            border: 1px solid #242c3e;
            border-radius: 8px;
            color: #fff;
            outline: none;

            &:focus {
              border-color: var(--accent);
            }
          }
        }
      }
    }

    /* Result Card */
    .result-card {
      background: linear-gradient(145deg, #181d2a 0%, #11141e 100%);
      border: 1px solid #2d364d;
      border-top: 3px solid var(--primary);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .result-header {
      text-align: center;
      padding-bottom: 14px;
      border-bottom: 1px solid #1f2638;

      .result-title {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 800;
        color: var(--accent);
      }

      .result-value {
        font-size: 2.4rem;
        font-weight: 800;
        color: #fff;
        font-family: ui-monospace, SFMono-Regular, monospace;
        line-height: 1.1;
        margin: 4px 0;
        text-shadow: 0 2px 10px rgba(225, 29, 72, 0.3);
      }

      .result-meta {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        font-size: 0.8rem;
        color: var(--text-muted);
        margin-top: 4px;

        .delta-tag {
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;

          &.pos {
            background: var(--success-bg);
            color: var(--success);
          }
          &.neg {
            background: var(--danger-bg);
            color: var(--danger);
          }
        }
      }
    }

    .deal-gap-banner {
      margin: 12px 0 6px 0;
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;

      &.deal-good {
        background: rgba(34, 197, 94, 0.12);
        border: 1px solid rgba(34, 197, 94, 0.35);

        .deal-gap-tag { color: #4ade80; }
        .deal-gap-val { color: #22c55e; }
      }

      &.deal-bad {
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.35);

        .deal-gap-tag { color: #f87171; }
        .deal-gap-val { color: #ef4444; }
      }

      .deal-gap-head {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .deal-gap-tag {
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .deal-gap-val {
          font-size: 1.05rem;
          font-weight: 800;
        }
      }

      .deal-gap-desc {
        font-size: 0.72rem;
        color: var(--text-muted);
        line-height: 1.35;
      }
    }

    /* Warranty widget inside result */
    .warranty-block {
      padding: 14px 0;
      border-bottom: 1px solid #1f2638;

      .warranty-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;

        .warranty-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 6px;

          .warranty-cap {
            font-size: 0.68rem;
            color: var(--text-muted);
            font-weight: normal;
          }
        }

        .warranty-badge {
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 0.72rem;
          font-weight: 700;
        }
      }

      .progress-track {
        background: #1e2436;
        height: 8px;
        border-radius: 4px;
        overflow: hidden;
        margin: 6px 0;
      }

      .progress-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease, background 0.3s ease;
      }

      .warranty-stats {
        display: flex;
        justify-content: space-between;
        font-size: 0.72rem;
        color: var(--text-muted);
        margin-top: 4px;
      }
    }

    /* Action buttons in right column */
    .result-actions {
      display: flex;
      gap: 8px;
      margin-top: 14px;

      .btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 8px;
        font-size: 0.8rem;

        .btn-emoji {
          font-size: 0.95rem;
        }
      }
    }

    /* Breakdown list */
    .breakdown-card {
      background: var(--card-bg);

      .breakdown-items {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .breakdown-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 4px;
        border-bottom: 1px solid #1a202c;
        font-size: 0.78rem;

        &:last-child {
          border-bottom: none;
        }

        &.zero-row {
          opacity: 0.55;
        }

        .b-label {
          color: var(--text-muted);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding-right: 8px;
        }

        .b-val {
          font-family: ui-monospace, monospace;
          font-weight: 700;
          white-space: nowrap;

          &.base-val { color: var(--accent); }
          &.pos-val { color: var(--success); }
          &.neg-val { color: var(--danger); }
          &.muted-val { color: var(--text-muted); }
          &.total-val { color: #fff; font-size: 0.95rem; }
        }

        &.base-row {
          .b-label {
            font-weight: 700;
            color: #fff;
          }
        }

        &.total-row {
          border-top: 2px solid #2e3852;
          padding-top: 8px;
          margin-top: 4px;

          .b-label {
            font-weight: 800;
            color: #fff;
          }
        }
      }
    }
  `]
})
export class CalculatorComponent {
  svc = inject(ValuationService);
  Math = Math;

  adjustKm(delta: number) {
    const next = Math.max(0, (this.svc.inputs().currentKm || 0) + delta);
    this.updateInput('currentKm', next);
  }

  setKm(val: number) {
    this.updateInput('currentKm', Math.max(0, val));
  }

  updateInput(key: string, value: any) {
    if (typeof value === 'string' && (key === 'currentKm' || key === 'customDeduction' || key === 'askingPrice')) {
      value = parseFloat(value) || 0;
    }
    this.svc.updateInputs({ [key]: value });
  }

  saveCar() {
    this.svc.addCurrentCar();
    this.showToast('Car saved to Compare tab!');
  }

  copyOffer() {
    const offer = `€${this.svc.finalOffer().toLocaleString()}`;
    const inp = this.svc.inputs();
    const trim = inp.trim === 'Perf' ? 'Performance' : 'Long Range';
    const ap = inp.apPkg;
    const warranty = this.svc.warrantyStatus().badgeText;
    const wheelText = inp.wheels === '20' ? '20" Induction' : inp.wheels === '21' ? '21" Überturbine' : '19" Gemini';
    const tireText = inp.tires === 'both'
      ? 'Summer + Winter Sets Included'
      : inp.tires === 'all_seasons'
      ? 'All Seasons'
      : `Summer Only (-€${this.svc.settings().summerOnlyPenalty} for Winter Tyres)`;
    const towText = inp.towHitch ? 'Yes (Tow Hitch Equipped)' : 'No';
    const suspSign = this.svc.settings().juniperSuspensionCost >= 0 ? '+' : '-';
    const suspAmt = Math.abs(this.svc.settings().juniperSuspensionCost).toLocaleString();
    const suspText = inp.needsJuniperSuspension
      ? `Yes (Juniper Softer Suspension Upgrade: ${suspSign}€${suspAmt})`
      : 'Stock Suspension';

    const factoryText = inp.gigaBerlin ? 'Yes (Giga Berlin Built)' : 'Shanghai / Fremont';

    const notes: string[] = [];
    if (inp.tires === 'summer') notes.push(`- Summer only tires: winter set needed (-€${this.svc.settings().summerOnlyPenalty})`);
    if (inp.needsJuniperSuspension) notes.push(`${suspSign} Juniper soft suspension upgrade (${suspSign}€${suspAmt})`);
    if (inp.gigaBerlin) notes.push(`+ Giga Berlin build adder (+€${this.svc.settings().gigaBerlinAdder})`);
    if (inp.dedTires) notes.push('- Tire replacement needed (€900)');
    if (inp.dedCurbrash) notes.push('- Wheel curb rash repairs (€300)');
    if (inp.dedBumper) notes.push('- Front bumper scrape / repaint (€450)');
    if (inp.dedWindshield) notes.push('- Windshield chip / scratch (€350)');
    if (inp.customDeduction) {
      const cName = inp.customDeductionName?.trim() || 'Custom deduction';
      notes.push(`- ${cName} (€${inp.customDeduction})`);
    }

    const customTitle = this.svc.currentCarTitle().trim();
    const titleHeader = customTitle ? `Tesla Model Y — ${customTitle} (${trim})` : `Tesla Model Y ${trim}`;
    const askingLine = inp.askingPrice && inp.askingPrice > 0
      ? `• Seller Asking Price: €${inp.askingPrice.toLocaleString()} (Deal Gap: ${this.svc.finalOffer() >= inp.askingPrice ? '+€' + (this.svc.finalOffer() - inp.askingPrice).toLocaleString() + ' under budget' : '-€' + (inp.askingPrice - this.svc.finalOffer()).toLocaleString() + ' above max offer'})\n`
      : '';

    const text = `${titleHeader} Valuation Breakdown:
${askingLine}• Mileage: ${inp.currentKm.toLocaleString()} km (${warranty} drivetrain warranty left)
• Build Factory: ${factoryText}
• Wheels: ${wheelText} | Tyres: ${tireText}
• Suspension: ${suspText}
• Trailer Coupling: ${towText}
• Package: Autopilot ${ap}
${notes.length ? notes.join('\n') + '\n' : ''}Target Max Offer: ${offer} (All condition & option factors accounted for)`;

    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Offer copied to clipboard!');
    }).catch(() => {
      alert(text);
    });
  }

  private showToast(msg: string) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 2000);
    }
  }
}
