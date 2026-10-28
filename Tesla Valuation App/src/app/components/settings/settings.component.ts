import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ValuationService } from '../../services/valuation.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <div class="card-title">
        <span>Valuation Engine Baseline Settings</span>
        <span class="badge">Persistent Config</span>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label for="basePriceAnchor">Baseline Car Anchor (€)</label>
          <input
            type="number"
            id="basePriceAnchor"
            [ngModel]="svc.settings().basePriceAnchor"
            (ngModelChange)="updateSetting('basePriceAnchor', $event)"
            step="250"
          />
          <span class="hint">Starting reference price for a baseline car</span>
        </div>

        <div class="form-group">
          <label for="yearValue">Value per Warranty Year (€/year)</label>
          <input
            type="number"
            id="yearValue"
            [ngModel]="svc.settings().yearValue"
            (ngModelChange)="updateSetting('yearValue', $event)"
            step="50"
          />
          <span class="hint">Added value per year of remaining drivetrain warranty</span>
        </div>

        <div class="form-group">
          <label for="annualKm">Your Annual Mileage (km/year)</label>
          <input
            type="number"
            id="annualKm"
            [ngModel]="svc.settings().annualKm"
            (ngModelChange)="updateSetting('annualKm', $event)"
            step="1000"
          />
          <span class="hint">Used to compute remaining warranty years (190k km limit)</span>
        </div>

        <div class="form-group">
          <label for="baseKm">Baseline Kilometers Reference</label>
          <input
            type="number"
            id="baseKm"
            [ngModel]="svc.settings().baseKm"
            (ngModelChange)="updateSetting('baseKm', $event)"
            step="5000"
          />
          <span class="hint">Mileage baseline reference point</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        <span>Option & Equipment Adjustments (€)</span>
        <span class="badge">Adders</span>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label for="towHitchAdder">Trailer Coupling / Tow Hitch Adder (€)</label>
          <input
            type="number"
            id="towHitchAdder"
            [ngModel]="svc.settings().towHitchAdder"
            (ngModelChange)="updateSetting('towHitchAdder', $event)"
            step="50"
          />
          <span class="hint">Value added when car is equipped with tow hitch</span>
        </div>

        <div class="form-group">
          <label for="wheels20Adder">20" Induction Wheels Adder (€)</label>
          <input
            type="number"
            id="wheels20Adder"
            [ngModel]="svc.settings().wheels20Adder"
            (ngModelChange)="updateSetting('wheels20Adder', $event)"
            step="50"
          />
          <span class="hint">Value added for 20" Induction wheel upgrade over 19" Gemini</span>
        </div>

        <div class="form-group">
          <label for="winterTireSetAdder">Separate Winter Tyre Set Adder (€)</label>
          <input
            type="number"
            id="winterTireSetAdder"
            [ngModel]="svc.settings().winterTireSetAdder"
            (ngModelChange)="updateSetting('winterTireSetAdder', $event)"
            step="50"
          />
          <span class="hint">Value added when seller includes both summer + winter sets</span>
        </div>

        <div class="form-group">
          <label for="perfAdder">Performance Trim Adder (€)</label>
          <input
            type="number"
            id="perfAdder"
            [ngModel]="svc.settings().perfAdder"
            (ngModelChange)="updateSetting('perfAdder', $event)"
            step="100"
          />
        </div>

        <div class="form-group">
          <label for="colorAdder">Metallic / Black Body Colour (€)</label>
          <input
            type="number"
            id="colorAdder"
            [ngModel]="svc.settings().colorAdder"
            (ngModelChange)="updateSetting('colorAdder', $event)"
            step="50"
          />
        </div>

        <div class="form-group">
          <label for="interiorAdder">White Interior Adder (€)</label>
          <input
            type="number"
            id="interiorAdder"
            [ngModel]="svc.settings().interiorAdder"
            (ngModelChange)="updateSetting('interiorAdder', $event)"
            step="50"
          />
        </div>

        <div class="form-group">
          <label for="eapAdder">Enhanced Autopilot (EAP) (€)</label>
          <input
            type="number"
            id="eapAdder"
            [ngModel]="svc.settings().eapAdder"
            (ngModelChange)="updateSetting('eapAdder', $event)"
            step="100"
          />
        </div>

        <div class="form-group">
          <label for="fsdAdder">Full Self-Driving (FSD) (€)</label>
          <input
            type="number"
            id="fsdAdder"
            [ngModel]="svc.settings().fsdAdder"
            (ngModelChange)="updateSetting('fsdAdder', $event)"
            step="100"
          />
        </div>

        <div class="form-group">
          <label for="hw4Adder">Hardware 4 (HW4) Computer (€)</label>
          <input
            type="number"
            id="hw4Adder"
            [ngModel]="svc.settings().hw4Adder"
            (ngModelChange)="updateSetting('hw4Adder', $event)"
            step="100"
          />
        </div>

        <div class="form-group">
          <label for="summerOnlyPenalty">Summer-Only Tyres Penalty (€ deduction)</label>
          <input
            type="number"
            id="summerOnlyPenalty"
            [ngModel]="svc.settings().summerOnlyPenalty"
            (ngModelChange)="updateSetting('summerOnlyPenalty', $event)"
            step="50"
          />
          <span class="hint">Deduction when only summer tyres are provided (buyer needs winter set)</span>
        </div>

        <div class="form-group">
          <label for="juniperSuspensionCost">Juniper Suspension Adjustment (€)</label>
          <input
            type="number"
            id="juniperSuspensionCost"
            [ngModel]="svc.settings().juniperSuspensionCost"
            (ngModelChange)="updateSetting('juniperSuspensionCost', $event)"
            step="100"
          />
          <span class="hint">Offer adjustment: use negative (e.g. -1500) to offer less to seller, or positive (+1500)</span>
        </div>

        <div class="form-group checkbox-group-wrap">
          <label class="config-checkbox-label" for="includeJuniperInSpiderPrice">
            <input
              type="checkbox"
              id="includeJuniperInSpiderPrice"
              [checked]="svc.settings().includeJuniperInSpiderPrice"
              (change)="updateSettingBool('includeJuniperInSpiderPrice', $any($event.target).checked)"
            />
            <span class="checkbox-text">
              <strong>Include in Spider Map Price</strong>
              <span class="hint">Includes the |€{{ Math.abs(svc.settings().juniperSuspensionCost).toLocaleString() }}| retrofit spend in car's Spider price score so you evaluate true all-in cost even when deducted from seller offer.</span>
            </span>
          </label>
        </div>

        <div class="form-group">
          <label for="gigaBerlinAdder">Giga Berlin Build Adder (€)</label>
          <input
            type="number"
            id="gigaBerlinAdder"
            [ngModel]="svc.settings().gigaBerlinAdder"
            (ngModelChange)="updateSetting('gigaBerlinAdder', $event)"
            step="100"
          />
          <span class="hint">Value added when car is built in Giga Berlin (better paint/build)</span>
        </div>

        <div class="form-group">
          <label for="atomPenalty">Intel Atom Penalty (€ deduction)</label>
          <input
            type="number"
            id="atomPenalty"
            [ngModel]="svc.settings().atomPenalty"
            (ngModelChange)="updateSetting('atomPenalty', $event)"
            step="100"
          />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      @media (max-width: 580px) {
        grid-template-columns: 1fr;
      }
      @media (min-width: 1400px) {
        grid-template-columns: 1fr 1fr 1fr;
      }
    }
    .hint {
      display: block;
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .checkbox-group-wrap {
      display: flex;
      align-items: center;
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 10px 14px;
      margin-top: 2px;
    }
    .config-checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      width: 100%;

      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: var(--accent);
        cursor: pointer;
        margin-top: 2px;
        flex-shrink: 0;
      }

      .checkbox-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 0.82rem;
        color: #fff;

        strong {
          color: var(--text);
          font-weight: 700;
        }

        .hint {
          margin-top: 0;
          line-height: 1.35;
        }
      }
    }
  `]
})
export class SettingsComponent {
  svc = inject(ValuationService);
  Math = Math;

  updateSetting(key: string, value: number) {
    const num = parseFloat(value as any) || 0;
    this.svc.updateSettings({ [key]: num });
  }

  updateSettingBool(key: string, value: boolean) {
    this.svc.updateSettings({ [key]: !!value });
  }
}
