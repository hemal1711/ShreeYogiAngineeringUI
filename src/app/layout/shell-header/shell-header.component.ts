import { DestroyRef, ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-shell-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './shell-header.component.html',
  styleUrl: './shell-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellHeaderComponent {
  
  private readonly destroyRef = inject(DestroyRef);
private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly layout = inject(LayoutService);
  readonly currentUser = this.authService.currentUser;
  readonly menuOpen = signal(false);
  readonly pageTitle = signal('Dashboard');
  readonly currentRoute = signal('/dashboard');
  readonly initials = computed(() => {
    const user = this.currentUser();
    const fullName = user?.fullName || user?.userName || 'Admin User';
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  constructor() {
    this.syncPageTitle();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncPageTitle());
  }

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
    this.authService.logout().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      void this.router.navigateByUrl('/auth/login');
    });
  }

  private syncPageTitle(): void {
    let active = this.router.routerState.snapshot.root;
    while (active.firstChild) {
      active = active.firstChild;
    }

    this.pageTitle.set(active.data?.['title'] || 'Dashboard');
    this.currentRoute.set(this.router.url.split('?')[0].split('#')[0] || '/dashboard');
  }
}
