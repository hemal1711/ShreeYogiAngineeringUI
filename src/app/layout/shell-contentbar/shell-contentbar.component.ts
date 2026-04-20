import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell-contentbar',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './shell-contentbar.component.html',
  styleUrl: './shell-contentbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellContentbarComponent {}
