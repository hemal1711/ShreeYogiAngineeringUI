import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  allPermissions?: readonly string[];
  children?: readonly { label: string; icon?: string; link: string; permissions?: readonly string[]; allPermissions?: readonly string[] }[];
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);
  readonly layout = inject(LayoutService);
  readonly currentUser = this.authService.currentUser;
  readonly expandedItems = signal<Set<string>>(new Set());

  readonly sections: readonly MenuSection[] = [
    {
      title: 'Workspace',
      items: [
        { label: 'Dashboard', icon: 'bi-grid', link: '/dashboard' },
        {
          label: 'Admin',
          icon: 'bi-gear',
          permissions: ['role.read', 'permission.read', 'rolepermission.read', 'user.read', 'userrole.read'],
          children: [
            { label: 'Roles', icon: 'bi-shield', link: '/roles', permissions: ['role.read'] },
            { label: 'Permissions', icon: 'bi-key', link: '/permissions', permissions: ['permission.read'] },
            { label: 'Role Permissions', icon: 'bi-key', link: '/role-permissions', permissions: ['rolepermission.read'] },
            { label: 'Users', icon: 'bi-people', link: '/users', permissions: ['user.read'] },
            { label: 'Role Users', icon: 'bi-person-check', link: '/user-roles', permissions: ['userrole.read'] }
          ]
        }
      ]
    },
    {
      title: 'Customers',
      items: [
        { label: 'Customers', icon: 'bi-buildings', link: '/customers', permissions: ['customer.read'] }
      ]
    },
    {
      title: 'Manufacturing',
      items: [
        {
          label: 'Mfg. Items',
          icon: 'bi-box-seam',
          permissions: ['manufacturingitem.read', 'manufacturingitem.create', 'manufacturingoperation.read', 'productionreport.read'],
          children: [
            { label: 'Mfg. Items', icon: 'bi-box-seam', link: '/manufacturing-items', permissions: ['manufacturingitem.read'] },
            { label: 'Mfg. Operations', icon: 'bi-box-seam', link: '/manufacturing-operations', permissions: ['manufacturingoperation.read'] },
            { label: 'Production Reports', icon: 'bi-clock-history', link: '/production-reports', allPermissions: ['productionreport.read', 'machinetype.read'] },
            { label: 'Stock (Party-wise)', icon: 'bi-clipboard-data', link: '/manufacturing-stock', permissions: ['manufacturingoperation.read'] },
            { label: 'Add Mfg. Item', icon: 'bi-plus-circle', link: '/manufacturing-items/add', permissions: ['manufacturingitem.create'] }
          ]
        }
      ]
    },
    {
      title: 'Tooling',
      items: [
        {
          label: 'Tooling Items',
          icon: 'bi-wrench',
          permissions: ['toolingitem.read', 'toolingitem.create', 'toolingoperation.read'],
          children: [
            { label: 'Tooling Items', icon: 'bi-wrench', link: '/tooling-items', permissions: ['toolingitem.read'] },
            { label: 'Tooling Ops', icon: 'bi-wrench', link: '/tooling-operations', permissions: ['toolingoperation.read'] },
            { label: 'Stock (Party-wise)', icon: 'bi-clipboard-data', link: '/tooling-stock', permissions: ['toolingoperation.read'] },
            { label: 'Add Tooling Item', icon: 'bi-plus-circle', link: '/tooling-items/add', permissions: ['toolingitem.create'] }
          ]
        }
      ]
    },
    {
      title: 'System',
      items: [
        { label: 'Fasteners', icon: 'bi-hexagon', link: '/fasteners', permissions: ['fastener.read'] },
        {
          label: 'Instruments',
          icon: 'bi-rulers',
          permissions: ['instrument.read', 'instrumentissue.read'],
          children: [
            { label: 'Instruments', icon: 'bi-rulers', link: '/instruments', permissions: ['instrument.read'] },
            { label: 'Instrument Issues', icon: 'bi-clipboard-check', link: '/instrument-issues', permissions: ['instrumentissue.read'] }
          ]
        }
      ]
    }
  ];

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .pipe(takeUntilDestroyed(this.destroyRef))
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
    const childVisible = item.children?.some((child) => this.canShowChild(child.permissions, child.allPermissions)) ?? false;
    return childVisible || this.canShowPermissions(item.permissions, item.allPermissions);
  }

  canShowChild(permissions?: readonly string[], allPermissions?: readonly string[]): boolean {
    return this.canShowPermissions(permissions, allPermissions);
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

  private canShowPermissions(permissions?: readonly string[], allPermissions?: readonly string[]): boolean {
    if (allPermissions?.length) {
      return this.permissionService.hasAll(allPermissions);
    }

    return !permissions?.length || this.permissionService.hasAny(permissions);
  }
}
