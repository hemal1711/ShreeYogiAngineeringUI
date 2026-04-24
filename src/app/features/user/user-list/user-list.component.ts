import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PagedResponse, User } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent {
  
  private readonly destroyRef = inject(DestroyRef);
private readonly accessControlService = inject(AccessControlService);
  private readonly permissionService = inject(PermissionService);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);

  readonly users = signal<User[]>([]);
  readonly isLoading = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);
  searchTerm = '';

  readonly canCreate = this.permissionService.has('user.create');
  readonly canUpdate = this.permissionService.has('user.update');
  readonly canDelete = this.permissionService.has('user.delete');

  constructor() {
    this.loadUsers();
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

  loadUsers(): void {
    this.isLoading.set(true);
    this.accessControlService.getUsers(this.pageNumber(), this.pageSize(), this.searchTerm).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const data = response.data as PagedResponse<User> | undefined;
        const items = (data?.items ?? []).filter((user) => !this.isSuperAdminUser(user));
        const totalCount = data?.totalCount ?? 0;
        if (items.length === 0 && this.pageNumber() > 1 && totalCount > 0) {
          this.pageNumber.set(1);
          this.loadUsers();
          return;
        }
        this.users.set(items);
        this.totalCount.set(totalCount);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message || 'We could not load users. Please try again.', 'Users not loaded', {
          action: { label: 'Retry', callback: () => this.loadUsers() }
        });
      }
    });
  }

  onSearch(): void {
    this.pageNumber.set(1);
    this.loadUsers();
  }

  onPageChange(page: number): void {
    this.pageNumber.set(page);
    this.loadUsers();
  }
  exportCsv(): void {
    this.downloadCsv('users.csv', [['User','Email','Full Name','Phone','Status'], ...this.users().map(x => [x.userName, x.email || '', this.getFullName(x), x.phoneNumber || '', x.isActive ? 'Active' : 'Inactive'])]);
  }

  onDelete(user: User): void {
    this.dialogService.showDelete('user').then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.deletingId.set(user.correlationId);
      this.accessControlService.deleteUser(user.correlationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.deletingId.set(null);
          this.toastService.success(`${user.userName} deleted successfully.`, 'User deleted');
          this.loadUsers();
        },
        error: (error) => {
          this.deletingId.set(null);
          this.toastService.error(error?.error?.message || 'We could not delete this user. Please try again.', 'Delete failed');
        }
      });
    });
  }

  getFullName(user: User): string {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || '-';
  }

  getStatusBadge(isActive: boolean): { class: string; text: string } {
    return isActive ? { class: 'badge-success', text: 'Active' } : { class: 'badge-danger', text: 'Inactive' };
  }

  private isSuperAdminUser(user: User): boolean {
    return user.userName.trim().toLowerCase() === 'superadmin';
  }
  private downloadCsv(fileName: string, rows: string[][]): void { const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); }
}
