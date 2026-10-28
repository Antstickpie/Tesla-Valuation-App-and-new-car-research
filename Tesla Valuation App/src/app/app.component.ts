import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalculatorComponent } from './components/calculator/calculator.component';
import { SettingsComponent } from './components/settings/settings.component';
import { CompareComponent } from './components/compare/compare.component';
import { ValuationService } from './services/valuation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CalculatorComponent, SettingsComponent, CompareComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  svc = inject(ValuationService);
  activeTab = signal<'calc' | 'settings' | 'compare'>('calc');

  setTab(tab: 'calc' | 'settings' | 'compare') {
    this.activeTab.set(tab);
  }
}

