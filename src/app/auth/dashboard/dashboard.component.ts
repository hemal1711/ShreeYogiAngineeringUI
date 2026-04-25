import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartOptions, registerables } from 'chart.js';
import { DashboardSummary } from '../../core/models/access-control.model';
import { AccessControlService } from '../../core/services/access-control.service';
import { BreadcrumbComponent } from '../../shared/breadcrumb/breadcrumb.component';

Chart.register(...registerables);

interface MetricCard {
  label: string;
  value: string;
  icon: string;
  meta: string;
  tone: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BaseChartDirective, BreadcrumbComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly accessControlService = inject(AccessControlService);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  readonly metricCards = computed<readonly MetricCard[]>(() => {
    const summary = this.summary();
    if (!summary) {
      return [];
    }

    return [
      { label: 'Customers', value: this.formatNumber(summary.customerCount), icon: 'bi-people', meta: `${this.formatNumber(summary.activeCustomerCount)} active`, tone: 'blue' },
      { label: 'Mfg. Items', value: this.formatNumber(summary.manufacturingItemCount), icon: 'bi-box-seam', meta: `${this.formatNumber(summary.activeManufacturingItemCount)} active`, tone: 'purple' },
      { label: 'Tooling Items', value: this.formatNumber(summary.toolingItemCount), icon: 'bi-wrench', meta: `${this.formatNumber(summary.activeToolingItemCount)} active`, tone: 'green' },
      { label: 'Instruments', value: this.formatNumber(summary.instrumentCount), icon: 'bi-rulers', meta: `${this.formatNumber(summary.openInstrumentIssueCount)} issued`, tone: 'orange' },
      { label: 'Low Stock Alerts', value: this.formatNumber(summary.lowStockAlertCount), icon: 'bi-exclamation-triangle', meta: `Mfg ${this.formatNumber(summary.manufacturingLowStockCount)} | Tooling ${this.formatNumber(summary.toolingLowStockCount)} | Fastener ${this.formatNumber(summary.fastenerLowStockCount)}`, tone: 'red' },
      { label: 'Total Mfg. Ops', value: this.formatNumber(summary.totalManufacturingOperationCount), icon: 'bi-activity', meta: `${this.formatNumber(summary.recentManufacturingOperationCount)} recent`, tone: 'cyan' }
    ];
  });

  readonly manufacturingChartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const points = this.summary()?.manufacturingStock ?? [];
    return {
      labels: points.map((point) => point.itemCode),
      datasets: [
        {
          label: 'Received',
          data: points.map((point) => point.receivedQty),
          backgroundColor: '#3b82f6',
          borderRadius: 4
        },
        {
          label: 'Dispatched',
          data: points.map((point) => point.dispatchedQty),
          backgroundColor: '#8b5cf6',
          borderRadius: 4
        },
        {
          label: 'In Hand',
          data: points.map((point) => point.qtyInHand),
          backgroundColor: '#22c55e',
          borderRadius: 4
        }
      ]
    };
  });

  readonly barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          boxWidth: 18,
          color: '#475569',
          font: { size: 12 }
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#0f172a'
      }
    },
    scales: {
      x: {
        grid: {
          color: '#e2e8f0'
        },
        border: {
          color: '#94a3b8'
        },
        ticks: {
          color: '#64748b',
          font: { size: 11 }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#64748b',
          font: { size: 11 }
        },
        border: {
          color: '#94a3b8'
        },
        grid: {
          color: '#e2e8f0'
        }
      }
    }
  };

  readonly stockStatusChartData = computed<ChartConfiguration<'doughnut'>['data']>(() => {
    const status = this.summary()?.toolingStockStatus;
    return {
      labels: ['In Stock', 'Low Stock', 'Out of Stock'],
      datasets: [
        {
          data: status ? [status.inStockCount, status.lowStockCount, status.outOfStockCount] : [0, 0, 0],
          backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
          borderColor: '#ffffff',
          borderWidth: 0,
          hoverOffset: 4
        }
      ]
    };
  });

  readonly fastenerStockChartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const points = this.summary()?.fastenerStock ?? [];
    return {
      labels: points.map((point) => point.itemCode),
      datasets: [
        { label: 'Current Stock', data: points.map((point) => point.currentStock), backgroundColor: '#0ea5e9', borderRadius: 4 },
        { label: 'Minimum Stock', data: points.map((point) => point.minimumStock), backgroundColor: '#f97316', borderRadius: 4 }
      ]
    };
  });

  readonly instrumentIssueChartData = computed<ChartConfiguration<'pie'>['data']>(() => {
    const status = this.summary()?.instrumentIssueStatus;
    return {
      labels: ['Issued', 'Returned'],
      datasets: [
        { data: status ? [status.issuedCount, status.returnedCount] : [0, 0], backgroundColor: ['#f97316', '#22c55e'], borderWidth: 0 }
      ]
    };
  });

  readonly calibrationChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.summary()?.calibrationPlan ?? [];
    return {
      labels: points.map((point) => point.label),
      datasets: [
        {
          label: 'Calibration Due',
          data: points.map((point) => point.dueCount),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.14)',
          pointBackgroundColor: '#ef4444',
          fill: true,
          tension: 0.35
        }
      ]
    };
  });

  readonly doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    animation: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          color: '#475569',
          font: { size: 12 },
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: '#0f172a'
      }
    }
  };

  readonly pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: true, position: 'bottom' }, tooltip: { backgroundColor: '#0f172a' } }
  };

  readonly lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: true, position: 'bottom' }, tooltip: { backgroundColor: '#0f172a' } },
    scales: {
      x: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
      y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', precision: 0 } }
    }
  };

  reload(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.accessControlService
      .getDashboardSummary()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (response) => {
          this.summary.set(response.data ?? null);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.summary.set(null);
          this.loadError.set(error?.error?.message || 'We could not load dashboard data. Please try again.');
          this.isLoading.set(false);
        }
      });
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2
    }).format(value);
  }
}
