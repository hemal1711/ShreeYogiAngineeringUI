import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  readonly settingsGroups = [
    {
      title: 'Payment Configuration',
      description: 'Control payout providers, currency behavior, and withdrawal availability for your providers.',
      status: 'Attention needed'
    },
    {
      title: 'Notification Preferences',
      description: 'Choose how booking alerts, payout updates, and workspace notifications are delivered to the team.',
      status: 'Configured'
    },
    {
      title: 'Regional Settings',
      description: 'Manage country, timezone, invoice formatting, and operational defaults for this workspace.',
      status: 'Configured'
    }
  ] as const;
}
