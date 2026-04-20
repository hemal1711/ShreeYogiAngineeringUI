import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { LayoutService } from '../layout.service';

interface MenuItem {
  label: string;
  icon: string;
  link?: string;
  permissions?: readonly string[];
  children?: readonly { label: string; link: string; permissions?: readonly string[] }[];
}

interface MenuSection {
  title: string;
  items: readonly MenuItem[];
}

@Component({
  selector: 'app-shell-sidebar',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive],
  templateUrl: './shell-sidebar.component.html',
  styleUrl: './shell-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellSidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);
  readonly layout = inject(LayoutService);
  readonly currentUser = this.authService.currentUser;
  readonly expandedItems = signal<Set<string>>(new Set());

  readonly sections: readonly MenuSection[] = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', icon: 'bi-grid', link: '/dashboard' },
        { label: 'Bookings', icon: 'bi-calendar-check', link: '/bookings', permissions: ['booking.read'] }
      ]
    },
    {
      title: 'Service',
      items: [
        {
          label: 'Services',
          icon: 'bi-briefcase',
          permissions: ['service.read', 'service.create'],
          children: [
            { label: 'Service Catalog', link: '/services', permissions: ['service.read'] },
            { label: 'Add Service', link: '/services/add', permissions: ['service.create'] }
          ]
        }
      ]
    },
    {
      title: 'Custom Job',
      items: [
        { label: 'Job Request List', icon: 'bi-card-list', link: '/job-requests', permissions: ['jobrequest.read'] },
        { label: 'Job Service List', icon: 'bi-list-task', link: '/job-services', permissions: ['jobservice.read'] }
      ]
    },
    {
      title: 'User',
      items: [
        {
          label: 'Users',
          icon: 'bi-person',
          permissions: ['user.read', 'user.create'],
          children: [
            { label: 'User Directory', link: '/users', permissions: ['user.read'] },
            { label: 'Add User', link: '/users/add', permissions: ['user.create'] }
          ]
        },
        {
          label: 'Roles',
          icon: 'bi-person-badge',
          permissions: ['role.read', 'role.create'],
          children: [
            { label: 'Role List', link: '/roles', permissions: ['role.read'] },
            { label: 'Add Role', link: '/roles/add', permissions: ['role.create'] }
          ]
        },
        {
          label: 'Permissions',
          icon: 'bi-shield-check',
          permissions: ['permission.read', 'permission.create'],
          children: [
            { label: 'Permission List', link: '/permissions', permissions: ['permission.read'] },
            { label: 'Add Permission', link: '/permissions/add', permissions: ['permission.create'] }
          ]
        },
        { label: 'User Roles', icon: 'bi-person-check', link: '/user-roles', permissions: ['userrole.read'] },
        { label: 'Settings', icon: 'bi-gear', link: '/settings', permissions: ['settings.read'] }
      ]
    }
  ];

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.syncExpandedMenus());

    this.syncExpandedMenus();
  }

  toggleSection(label: string): void {
    if (this.layout.sidebarCollapsed()) {
      this.layout.toggleSidebar();
    }

    const next = new Set(this.expandedItems());
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    this.expandedItems.set(next);
  }

  isExpanded(label: string): boolean {
    return this.expandedItems().has(label);
  }

  isActive(link: string): boolean {
    return this.router.url === link;
  }

  hasActiveChild(item: MenuItem): boolean {
    return !!item.children?.some((child) => this.router.url === child.link);
  }

  hasVisibleItems(section: MenuSection): boolean {
    return section.items.some((item) => this.canShowItem(item));
  }

  canShowItem(item: MenuItem): boolean {
    const childVisible = item.children?.some((child) => this.canShowPermissions(child.permissions)) ?? false;
    return childVisible || this.canShowPermissions(item.permissions);
  }

  canShowChild(permissions?: readonly string[]): boolean {
    return this.canShowPermissions(permissions);
  }

  closeMobileSidebar(): void {
    if (window.innerWidth <= 960) {
      this.layout.closeMobileSidebar();
    }
  }

  private syncExpandedMenus(): void {
    const next = new Set<string>();

    for (const section of this.sections) {
      for (const item of section.items) {
        if (item.children?.some((child) => this.router.url === child.link)) {
          next.add(item.label);
        }
      }
    }

    this.expandedItems.set(next);
  }

  private canShowPermissions(permissions?: readonly string[]): boolean {
    return !permissions?.length || this.permissionService.hasAny(permissions);
  }
}
