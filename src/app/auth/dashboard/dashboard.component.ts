import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartOptions, registerables } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';

Chart.register(...registerables);

interface MetricCard {
  label: string;
  value: string;
  icon: string;
}

interface SummaryPanel {
  title: string;
  count: number;
  items: readonly { name: string; meta: string }[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;

  readonly metricCards: readonly MetricCard[] = [
    { label: 'Total Service', value: '109', icon: 'bi-calendar2-check' },
    { label: 'Total Tax', value: '$10.57', icon: 'bi-receipt' },
    { label: 'My Earning', value: '$415.44', icon: 'bi-cash-coin' },
    { label: 'Total Revenue', value: '$451.48', icon: 'bi-bar-chart' }
  ];

  readonly lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        data: [0, 0, 0, 450, 0, 0, 0, 0, 0, 0, 0, 0],
        borderColor: '#6663d2',
        backgroundColor: 'rgba(102, 99, 210, 0.12)',
        pointBackgroundColor: '#6663d2',
        pointBorderColor: '#6663d2',
        pointHoverBackgroundColor: '#6663d2',
        pointHoverBorderColor: '#6663d2',
        pointRadius: 4,
        pointHoverRadius: 5,
        tension: 0,
        fill: false
      }
    ]
  };

  readonly lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#1f2c49',
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        border: {
          display: false
        },
        ticks: {
          color: '#636d8d',
          font: {
            size: 11
          }
        }
      },
      y: {
        min: 0,
        max: 500,
        ticks: {
          stepSize: 100,
          color: '#8d95af',
          callback: (value) => `$${value}`,
          font: {
            size: 10
          }
        },
        border: {
          display: false
        },
        grid: {
          color: '#f0f1f6'
        }
      }
    },
    elements: {
      line: {
        borderWidth: 4
      }
    }
  };

  readonly summaryPanels: readonly SummaryPanel[] = [
    {
      title: 'Recent Providers',
      count: 17,
      items: [
        { name: 'Kelly Brown', meta: 'Provider joined today' },
        { name: 'Sanjay Patel', meta: 'Approved for plumbing service' }
      ]
    },
    {
      title: 'Recent Customers',
      count: 19,
      items: [
        { name: 'Ana Cooper', meta: 'Requested appliance repair' },
        { name: 'Rohit Soni', meta: 'Booked premium cleaning' }
      ]
    },
    {
      title: 'Recent Bookings',
      count: 3,
      items: [
        { name: 'Order #4512', meta: 'Scheduled for tomorrow' },
        { name: 'Order #4513', meta: 'Awaiting provider assignment' }
      ]
    }
  ];
}
