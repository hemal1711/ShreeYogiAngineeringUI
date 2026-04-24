import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Customer, PagedResponse } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerListComponent {
  
  private readonly destroyRef = inject(DestroyRef);
private readonly service = inject(AccessControlService);
  private readonly permissionService = inject(PermissionService);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);

  readonly customers = signal<Customer[]>([]);
  readonly isLoading = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);
  searchTerm = '';

  readonly canCreate = this.permissionService.has('customer.create');
  readonly canUpdate = this.permissionService.has('customer.update');
  readonly canDelete = this.permissionService.has('customer.delete');

  constructor() {
    this.loadCustomers();
  }

  get totalPages(): number { return Math.ceil(this.totalCount() / this.pageSize()); }
  get pageRange(): number[] {
    const start = Math.max(1, this.pageNumber() - 2);
    const end = Math.min(this.totalPages, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }

  loadCustomers(): void {
    this.isLoading.set(true);
    this.service.getCustomers(this.pageNumber(), this.pageSize(), this.searchTerm).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const data = response.data as PagedResponse<Customer> | undefined;
        this.customers.set(data?.items ?? []);
        this.totalCount.set(data?.totalCount ?? 0);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message || 'We could not load customers.', 'Customers not loaded');
      }
    });
  }

  onSearch(): void { this.pageNumber.set(1); this.loadCustomers(); }
  onPageChange(page: number): void { this.pageNumber.set(page); this.loadCustomers(); }
  exportCsv(): void {
    this.downloadCsv('customers.csv', [['Name','Code','Contact','Phone','Email','Address','Status'], ...this.customers().map(x => [x.customerName, x.code, x.contactPerson || '', x.phone || '', x.email || '', x.address || '', x.isActive ? 'Active' : 'Inactive'])]);
  }

  onDelete(customer: Customer): void {
    this.dialogService.showDelete('customer').then((confirmed) => {
      if (!confirmed) return;
      this.deletingId.set(customer.correlationId);
      this.service.deleteCustomer(customer.correlationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.deletingId.set(null);
          this.toastService.success('Customer deleted successfully.', 'Customer deleted');
          this.loadCustomers();
        },
        error: (error) => {
          this.deletingId.set(null);
          this.toastService.error(error?.error?.message || 'We could not delete this customer.', 'Delete failed');
        }
      });
    });
  }

  getStatusBadge(isActive: boolean): { class: string; text: string } {
    return isActive ? { class: 'badge-success', text: 'Active' } : { class: 'badge-danger', text: 'Inactive' };
  }
  private downloadCsv(fileName: string, rows: string[][]): void { const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); }
}
