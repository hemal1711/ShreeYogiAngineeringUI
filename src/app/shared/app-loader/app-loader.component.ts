import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-loader',
  standalone: true,
  templateUrl: './app-loader.component.html',
  styleUrl: './app-loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLoaderComponent {
  readonly loadingService = inject(LoadingService);
}
