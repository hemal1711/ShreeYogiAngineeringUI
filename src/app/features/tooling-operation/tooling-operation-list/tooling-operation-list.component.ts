import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PagedResponse, ToolingItem, ToolingOperation, ToolingOperationFilter } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({ selector: 'app-tooling-operation-list', standalone: true, imports: [CommonModule, FormsModule, RouterLink, BreadcrumbComponent], templateUrl: './tooling-operation-list.component.html', styleUrl: './tooling-operation-list.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class ToolingOperationListComponent {

  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(AccessControlService); private readonly permissionService = inject(PermissionService); private readonly dialogService = inject(ConfirmationDialogService); private readonly toastService = inject(ToastService);
  readonly operations = signal<ToolingOperation[]>([]); readonly items = signal<ToolingItem[]>([]); readonly isLoading = signal(false); readonly deletingId = signal<string | null>(null); readonly pageNumber = signal(1); readonly pageSize = signal(10); readonly totalCount = signal(0); readonly previewPhotoUrl = signal<string | null>(null); readonly types = ['Received', 'Used']; filter: ToolingOperationFilter = {
    itemCorrelationId : '',
    operationType: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  };
  readonly canCreate = this.permissionService.has('toolingoperation.create'); readonly canUpdate = this.permissionService.has('toolingoperation.update'); readonly canDelete = this.permissionService.has('toolingoperation.delete');
  constructor() { this.loadLookups(); this.loadOperations(); }
  get totalPages(): number { return Math.ceil(this.totalCount() / this.pageSize()); }
  get pageRange(): number[] { const s = Math.max(1, this.pageNumber() - 2); const e = Math.min(this.totalPages, s + 4); return Array.from({ length: Math.max(0, e - s + 1) }, (_, i) => s + i); }
  loadLookups(): void { this.service.getToolingItems(1, 200).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r => this.items.set((r.data as PagedResponse<ToolingItem> | undefined)?.items ?? [])); }
  loadOperations(): void { this.isLoading.set(true); this.service.getToolingOperations(this.pageNumber(), this.pageSize(), this.filter).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => { const d = r.data as PagedResponse<ToolingOperation> | undefined; this.operations.set(d?.items ?? []); this.totalCount.set(d?.totalCount ?? 0); this.isLoading.set(false); }, error: e => { this.isLoading.set(false); this.toastService.error(e?.error?.message || 'We could not load operations.', 'Operations not loaded'); } }); }
  onFilter(): void { this.pageNumber.set(1); this.loadOperations(); }
  onPageChange(page: number): void { this.pageNumber.set(page); this.loadOperations(); }
  exportCsv(): void { const rows = [['Date', 'Item Code', 'Item Name', 'Location', 'Type', 'Qty', 'Remarks'], ...this.operations().map(x => [this.formatDate(x.operationDate), x.itemCode, x.itemName, x.location || '', x.operationType, String(x.quantity), x.remarks || ''])]; const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = 'tooling-operations.csv'; a.click(); URL.revokeObjectURL(url); }
  onDelete(operation: ToolingOperation): void { this.dialogService.showDelete('tooling operation').then(c => { if (!c) return; this.deletingId.set(operation.correlationId); this.service.deleteToolingOperation(operation.correlationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.deletingId.set(null); this.toastService.success('Operation deleted.', 'Deleted'); this.loadOperations(); }, error: e => { this.deletingId.set(null); this.toastService.error(e?.error?.message || 'We could not delete this operation.', 'Delete failed'); } }); }); }
  badgeClass(type: string): string { return type === 'Received' ? 'badge-success' : 'badge-warning'; }
  formatDate(value: string): string { return value ? value.slice(0, 10) : ''; }
  getPhotoUrl(photoUrl?: string): string { if (!photoUrl) return ''; if (/^https?:\/\//i.test(photoUrl)) return photoUrl; return `${environment.apiBaseUrl.replace(/\/api\/?$/, '')}${photoUrl}`; }
  openPhoto(photoUrl?: string): void { if (photoUrl) this.previewPhotoUrl.set(this.getPhotoUrl(photoUrl)); }
  closePhoto(): void { this.previewPhotoUrl.set(null); }
}
