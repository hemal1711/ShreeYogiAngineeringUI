import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-feature-page',
  standalone: true,
  templateUrl: './feature-page.component.html',
  styleUrl: './feature-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeaturePageComponent {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly statLabel = input<string>('Open Items');
  readonly statValue = input<string>('24');
}
