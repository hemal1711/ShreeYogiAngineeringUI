import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ShellHeaderComponent } from '../shell-header/shell-header.component';
import { ShellSidebarComponent } from '../shell-sidebar/shell-sidebar.component';
import { ShellContentbarComponent } from '../shell-contentbar/shell-contentbar.component';
import { ShellFooterComponent } from '../shell-footer/shell-footer.component';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    NgClass,
    ShellHeaderComponent,
    ShellSidebarComponent,
    ShellContentbarComponent,
    ShellFooterComponent
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent {
  readonly layout = inject(LayoutService);
  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 960) {
      this.layout.closeMobileSidebar();
    }
  }
}
