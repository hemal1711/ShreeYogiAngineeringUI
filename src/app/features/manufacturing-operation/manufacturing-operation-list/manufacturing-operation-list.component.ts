import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Customer, ManufacturingItem, ManufacturingOperation, ManufacturingOperationFilter, PagedResponse } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-manufacturing-operation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './manufacturing-operation-list.component.html',
  styleUrl: './manufacturing-operation-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManufacturingOperationListComponent {
  
  private readonly destroyRef = inject(DestroyRef);
private readonly service = inject(AccessControlService);
  private readonly permissionService = inject(PermissionService);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);
  readonly operations = signal<ManufacturingOperation[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly items = signal<ManufacturingItem[]>([]);
  readonly isLoading = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);
  readonly previewPhotoUrl = signal<string | null>(null);
  readonly types = ['Received', 'Dispatched', 'Rejected'];
  filter: ManufacturingOperationFilter = {
    customerCorrelationId: '',
    itemCorrelationId: '',
    operationType: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  };
  readonly canCreate = this.permissionService.has('manufacturingoperation.create');
  readonly canUpdate = this.permissionService.has('manufacturingoperation.update');
  readonly canDelete = this.permissionService.has('manufacturingoperation.delete');
  constructor() { this.loadLookups(); this.loadOperations(); }
  get totalPages(): number { return Math.ceil(this.totalCount() / this.pageSize()); }
  get pageRange(): number[] { const s = Math.max(1, this.pageNumber() - 2); const e = Math.min(this.totalPages, s + 4); return Array.from({ length: Math.max(0, e - s + 1) }, (_, i) => s + i); }
  loadLookups(): void { this.service.getCustomers(1, 200).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r => this.customers.set((r.data as PagedResponse<Customer> | undefined)?.items ?? [])); this.service.getManufacturingItems(1, 200).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r => this.items.set((r.data as PagedResponse<ManufacturingItem> | undefined)?.items ?? [])); }
  loadOperations(): void { this.isLoading.set(true); this.service.getManufacturingOperations(this.pageNumber(), this.pageSize(), this.filter).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => { const d = r.data as PagedResponse<ManufacturingOperation> | undefined; this.operations.set(d?.items ?? []); this.totalCount.set(d?.totalCount ?? 0); this.isLoading.set(false); }, error: e => { this.isLoading.set(false); this.toastService.error(e?.error?.message || 'We could not load operations.', 'Operations not loaded'); } }); }
  onFilter(): void { this.pageNumber.set(1); this.loadOperations(); }
  onPageChange(page: number): void { this.pageNumber.set(page); this.loadOperations(); }
  exportCsv(): void { const rows = [['Date', 'Item Code', 'Customer', 'Type', 'Qty', 'Challan No', 'Lot No', 'Remarks'], ...this.operations().map(x => [this.formatDate(x.operationDate), x.itemCode, x.customerCode, x.operationType, String(x.quantity), x.challanNo || '', x.lotNo || '', x.remarks || ''])]; const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = 'manufacturing-operations.csv'; a.click(); URL.revokeObjectURL(url); }
  onDelete(operation: ManufacturingOperation): void { this.dialogService.showDelete('manufacturing operation').then(c => { if (!c) return; this.deletingId.set(operation.correlationId); this.service.deleteManufacturingOperation(operation.correlationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.deletingId.set(null); this.toastService.success('Operation deleted.', 'Deleted'); this.loadOperations(); }, error: e => { this.deletingId.set(null); this.toastService.error(e?.error?.message || 'We could not delete this operation.', 'Delete failed'); } }); }); }
  badgeClass(type: string): string { return type === 'Rejected' ? 'badge-danger' : type === 'Received' ? 'badge-success' : 'badge-info'; }
  formatDate(value: string): string { return value ? value.slice(0, 10) : ''; }
  getPhotoUrl(photoUrl?: string): string { if (!photoUrl) return ''; if (/^https?:\/\//i.test(photoUrl)) return photoUrl; return `${environment.apiBaseUrl.replace(/\/api\/?$/, '')}${photoUrl}`; }
  openPhoto(photoUrl?: string): void { if (photoUrl) this.previewPhotoUrl.set(this.getPhotoUrl(photoUrl)); }
  closePhoto(): void { this.previewPhotoUrl.set(null); }
}
