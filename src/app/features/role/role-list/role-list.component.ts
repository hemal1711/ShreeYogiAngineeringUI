import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PagedResponse, Role } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './role-list.component.html',
  styleUrl: './role-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleListComponent {
  
  private readonly destroyRef = inject(DestroyRef);
private readonly accessControlService = inject(AccessControlService);
  private readonly permissionService = inject(PermissionService);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);

  readonly roles = signal<Role[]>([]);
  readonly isLoading = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);
  searchTerm = '';

  readonly canCreate = this.permissionService.has('role.create');
  readonly canUpdate = this.permissionService.has('role.update');
  readonly canDelete = this.permissionService.has('role.delete');

  constructor() {
    this.loadRoles();
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

  loadRoles(): void {
    this.isLoading.set(true);
    this.accessControlService.getRoles(this.pageNumber(), this.pageSize(), this.searchTerm).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const data = response.data as PagedResponse<Role> | undefined;
        const roles = (data?.items ?? []).filter((role) => !role.isSystemRole);
        const totalCount = data?.totalCount ?? roles.length;
        if (roles.length === 0 && this.pageNumber() > 1 && totalCount > 0) {
          this.pageNumber.set(1);
          this.loadRoles();
          return;
        }
        this.roles.set(roles);
        this.totalCount.set(totalCount);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message || 'We could not load roles. Please try again.', 'Roles not loaded', {
          action: { label: 'Retry', callback: () => this.loadRoles() }
        });
      }
    });
  }

  onSearch(): void {
    this.pageNumber.set(1);
    this.loadRoles();
  }

  onPageChange(page: number): void {
    this.pageNumber.set(page);
    this.loadRoles();
  }
  exportCsv(): void {
    this.downloadCsv('roles.csv', [['Role','Status','Created'], ...this.roles().map(x => [x.roleName, x.isActive ? 'Active' : 'Inactive', x.createdOn])]);
  }

  onDelete(role: Role): void {
    this.dialogService.showDelete('role').then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.deletingId.set(role.correlationId);
      this.accessControlService.deleteRole(role.correlationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.deletingId.set(null);
          this.toastService.success(`${role.roleName} deleted successfully.`, 'Role deleted');
          this.loadRoles();
        },
        error: (error) => {
          this.deletingId.set(null);
          this.toastService.error(error?.error?.message || 'We could not delete this role. Please try again.', 'Delete failed');
        }
      });
    });
  }

  getStatusBadge(isActive: boolean): { class: string; text: string } {
    return isActive ? { class: 'badge-success', text: 'Active' } : { class: 'badge-danger', text: 'Inactive' };
  }
  private downloadCsv(fileName: string, rows: string[][]): void { const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); }
}
