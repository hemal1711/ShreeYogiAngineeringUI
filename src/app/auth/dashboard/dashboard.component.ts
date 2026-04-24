import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartOptions, registerables } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';

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
  imports: [BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;

  readonly metricCards: readonly MetricCard[] = [
    { label: 'Customers', value: '5', icon: 'bi-people', meta: '+2 this month', tone: 'blue' },
    { label: 'Mfg. Items', value: '16', icon: 'bi-box-seam', meta: '6 active', tone: 'purple' },
    { label: 'Tooling Items', value: '9', icon: 'bi-wrench', meta: '7 tracked', tone: 'green' },
    { label: 'Instruments', value: '7', icon: 'bi-rulers', meta: '3 issued', tone: 'orange' },
    { label: 'Low Stock Alerts', value: '8', icon: 'bi-exclamation-triangle', meta: 'Need attention', tone: 'red' },
    { label: 'Total Mfg. Ops', value: '23', icon: 'bi-activity', meta: '5 recent', tone: 'cyan' }
  ];

  readonly manufacturingChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['TX-5053', 'TX-0684', 'BIG-BODY', 'FLANGE...', 'MAIN-CRO...', 'MINI-STA...'],
    datasets: [
      {
        label: 'Received',
        data: [2850, 580, 690, 520, 350, 500],
        backgroundColor: '#3b82f6',
        borderRadius: 4
      },
      {
        label: 'Dispatched',
        data: [5500, 1080, 0, 0, 0, 0],
        backgroundColor: '#8b5cf6',
        borderRadius: 4
      },
      {
        label: 'In Hand',
        data: [0, 0, 680, 520, 360, 510],
        backgroundColor: '#22c55e',
        borderRadius: 4
      }
    ]
  };

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
        min: 0,
        max: 6000,
        ticks: {
          stepSize: 1500,
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

  readonly stockStatusChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['In Stock', 'Low Stock', 'Out of Stock'],
    datasets: [
      {
        data: [70, 25, 35],
        backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
        borderColor: '#ffffff',
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  readonly fastenerStockChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Bolts', 'Nuts', 'Washers', 'Screws'],
    datasets: [
      { label: 'Current Stock', data: [770, 680, 1600, 850], backgroundColor: '#0ea5e9', borderRadius: 4 },
      { label: 'Minimum Stock', data: [200, 400, 1000, 300], backgroundColor: '#f97316', borderRadius: 4 }
    ]
  };

  readonly instrumentIssueChartData: ChartConfiguration<'pie'>['data'] = {
    labels: ['Issued', 'Returned'],
    datasets: [
      { data: [3, 2], backgroundColor: ['#f97316', '#22c55e'], borderWidth: 0 }
    ]
  };

  readonly calibrationChartData: ChartConfiguration<'line'>['data'] = {
    labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    datasets: [
      {
        label: 'Calibration Due',
        data: [2, 4, 3, 5, 6, 4],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.14)',
        pointBackgroundColor: '#ef4444',
        fill: true,
        tension: 0.35
      }
    ]
  };

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
}
