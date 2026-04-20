import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-shell-footer',
  standalone: true,
  templateUrl: './shell-footer.component.html',
  styleUrl: './shell-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellFooterComponent {}
