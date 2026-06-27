import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { AccessControlService } from '../../core/services/access-control.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { NotificationCenterItem } from '../../core/models/access-control.model';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-shell-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './shell-header.component.html',
  styleUrl: './shell-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellHeaderComponent {
  
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly accessControlService = inject(AccessControlService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly layout = inject(LayoutService);
  readonly currentUser = this.authService.currentUser;
  readonly menuOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly notifications = signal<NotificationCenterItem[]>([]);
  readonly unreadCount = signal(0);
  readonly notificationsLoading = signal(false);
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
    this.loadNotificationCount();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.syncPageTitle();
        this.loadNotificationCount();
      });
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.menuOpen.set(false);
      this.notificationsOpen.set(false);
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
    this.notificationsOpen.set(false);
    this.menuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleNotifications(): void {
    this.menuOpen.set(false);
    this.notificationsOpen.update((value) => !value);

    if (this.notificationsOpen()) {
      this.loadNotifications();
    }
  }

  openNotification(notification: NotificationCenterItem): void {
    this.notificationsOpen.set(false);
    this.accessControlService.markNotificationRead(notification.correlationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadNotificationCount();
      });

    void this.router.navigateByUrl(this.notificationLink(notification));
  }

  markAllNotificationsRead(): void {
    this.accessControlService.markAllNotificationsRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.notifications.update((items) => items.map((item) => ({ ...item, isRead: true })));
        this.unreadCount.set(0);
      });
  }

  notificationSubtitle(notification: NotificationCenterItem): string {
    if (notification.notificationType === 'HourlyEntryMissed') {
      return `${notification.operatorName} | ${notification.slotFromTime} - ${notification.slotToTime}`;
    }

    return `${notification.itemCode} | ${notification.slotFromTime} - ${notification.slotToTime}`;
  }

  logout(): void {
    this.closeMenu();
    this.notificationsOpen.set(false);
    this.pushNotificationService.unregisterCurrentDevice();
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

  private loadNotificationCount(): void {
    this.accessControlService.getUnreadNotificationCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.unreadCount.set(response.data ?? 0),
        error: () => this.unreadCount.set(0)
      });
  }

  private loadNotifications(): void {
    this.notificationsLoading.set(true);
    this.accessControlService.getNotifications(20)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.notifications.set(response.data ?? []);
          this.notificationsLoading.set(false);
        },
        error: () => {
          this.notifications.set([]);
          this.notificationsLoading.set(false);
        }
      });
  }

  private notificationLink(notification: NotificationCenterItem): string {
    const fromTime = this.toTimeInputValue(notification.slotFromTime);
    const toTime = this.toTimeInputValue(notification.slotToTime);
    const query = fromTime && toTime
      ? `?autoAddSlot=true&slotFrom=${encodeURIComponent(fromTime)}&slotTo=${encodeURIComponent(toTime)}`
      : '';

    return `/production-reports/edit/${notification.productionReportCorrelationId}${query}`;
  }

  private toTimeInputValue(value: string): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (twentyFourHourMatch) {
      return `${twentyFourHourMatch[1].padStart(2, '0')}:${twentyFourHourMatch[2]}`;
    }

    const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!twelveHourMatch) return null;

    let hours = Number(twelveHourMatch[1]);
    const minutes = twelveHourMatch[2];
    const meridiem = twelveHourMatch[3].toUpperCase();

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
}
