import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-shell-header',
  standalone: true,
  imports: [UpperCasePipe, RouterLink],
  templateUrl: './shell-header.component.html',
  styleUrl: './shell-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellHeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly layout = inject(LayoutService);
  readonly currentUser = this.authService.currentUser;
  readonly menuOpen = signal(false);
  readonly initials = computed(() => {
    const fullName = this.currentUser()?.fullName ?? 'Workspace User';
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.menuOpen.set(false);
    }
  }

  toggleSidebar(): void {
    if (window.innerWidth <= 960) {
      this.layout.toggleMobileSidebar();
      return;
    }

    this.layout.toggleSidebar();
  }

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    this.authService.logout().subscribe(() => {
      void this.router.navigateByUrl('/auth/login');
    });
  }
}
