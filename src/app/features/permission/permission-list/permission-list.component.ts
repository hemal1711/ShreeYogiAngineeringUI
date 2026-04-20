import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Permission, PagedResponse } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

type PermissionAction = 'read' | 'create' | 'update' | 'delete';

interface PermissionMatrixRow {
  module: string;
  moduleLabel: string;
  actions: Partial<Record<PermissionAction, Permission>>;
  otherActions: Permission[];
}

@Component({
  selector: 'app-permission-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './permission-list.component.html',
  styleUrl: './permission-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionListComponent {
  private readonly accessControlService = inject(AccessControlService);
  private readonly permissionService = inject(PermissionService);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);

  readonly permissions = signal<Permission[]>([]);
  readonly isLoading = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(200);
  readonly totalCount = signal(0);
  readonly error = signal<string | null>(null);
  readonly permissionActions: PermissionAction[] = ['read', 'create', 'update', 'delete'];
  readonly permissionMatrix = computed<PermissionMatrixRow[]>(() => this.buildPermissionMatrix(this.permissions()));

  searchTerm = '';
  readonly canCreate = this.permissionService.has('permission.create');
  readonly canUpdate = this.permissionService.has('permission.update');
  readonly canDelete = this.permissionService.has('permission.delete');

  constructor() {
    this.loadPermissions();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize());
  }

  get pageRange(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.pageNumber() - 2);
    const end = Math.min(this.totalPages, start + 4);
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
    return pages;
  }

  loadPermissions(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.accessControlService.getPermissions(this.pageNumber(), this.pageSize(), this.searchTerm).subscribe({
      next: (response) => {
        const data = response.data as PagedResponse<Permission> | undefined;
        const items = data?.items ?? [];
        const totalCount = data?.totalCount ?? 0;
        if (items.length === 0 && this.pageNumber() > 1 && totalCount > 0) {
          this.pageNumber.set(1);
          this.loadPermissions();
          return;
        }
        this.permissions.set(items);
        this.totalCount.set(totalCount);
        this.isLoading.set(false);
      },
      error: (error) => {
        const message = error?.error?.message || 'We could not load permissions. Please try again.';
        this.error.set(message);
        this.toastService.error(message, 'Permissions not loaded', {
          action: { label: 'Retry', callback: () => this.loadPermissions() }
        });
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    this.pageNumber.set(1);
    this.loadPermissions();
  }

  onPageChange(page: number): void {
    this.pageNumber.set(page);
    this.loadPermissions();
  }

  onDelete(permission: Permission): void {
    this.dialogService.showDelete('permission').then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.deletingId.set(permission.correlationId);
      this.accessControlService.deletePermission(permission.correlationId).subscribe({
        next: () => {
          this.deletingId.set(null);
          this.toastService.success(`${permission.code} deleted successfully.`, 'Permission deleted');
          this.loadPermissions();
        },
        error: (error) => {
          const message = error?.error?.message || 'We could not delete this permission. Please try again.';
          this.error.set(message);
          this.deletingId.set(null);
          this.toastService.error(message, 'Delete failed');
        }
      });
    });
  }

  getStatusBadge(isActive: boolean): { class: string; text: string } {
    return isActive ? { class: 'badge-success', text: 'Active' } : { class: 'badge-danger', text: 'Inactive' };
  }

  getPermissionActionLabel(action: PermissionAction): string {
    return action.charAt(0).toUpperCase() + action.slice(1);
  }

  getActionPermission(row: PermissionMatrixRow, action: PermissionAction): Permission | undefined {
    return row.actions[action];
  }

  formatModuleName(module: string): string {
    return module
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private buildPermissionMatrix(permissions: Permission[]): PermissionMatrixRow[] {
    const rows = new Map<string, PermissionMatrixRow>();

    [...permissions]
      .sort((first, second) => first.code.localeCompare(second.code))
      .forEach((permission) => {
        const [modulePart, actionPart = ''] = permission.code.split('.');
        const module = modulePart || permission.code;
        const action = actionPart.toLowerCase() as PermissionAction;

        if (!rows.has(module)) {
          rows.set(module, {
            module,
            moduleLabel: this.formatModuleName(module),
            actions: {},
            otherActions: []
          });
        }

        const row = rows.get(module)!;
        if (this.permissionActions.includes(action)) {
          row.actions[action] = permission;
        } else {
          row.otherActions.push(permission);
        }
      });

    return Array.from(rows.values());
  }
}
