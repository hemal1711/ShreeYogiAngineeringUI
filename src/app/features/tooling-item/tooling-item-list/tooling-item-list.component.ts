import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PagedResponse, ToolingItem } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-tooling-item-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './tooling-item-list.component.html',
  styleUrl: './tooling-item-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolingItemListComponent {
  
  private readonly destroyRef = inject(DestroyRef);
private readonly service = inject(AccessControlService);
  private readonly permissionService = inject(PermissionService);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);
  readonly items = signal<ToolingItem[]>([]);
  readonly isLoading = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);
  readonly previewPhotoUrl = signal<string | null>(null);
  searchTerm = '';
  readonly canCreate = this.permissionService.has('toolingitem.create');
  readonly canUpdate = this.permissionService.has('toolingitem.update');
  readonly canDelete = this.permissionService.has('toolingitem.delete');
  constructor() { this.loadItems(); }
  get totalPages(): number { return Math.ceil(this.totalCount() / this.pageSize()); }
  get pageRange(): number[] { const s = Math.max(1, this.pageNumber() - 2); const e = Math.min(this.totalPages, s + 4); return Array.from({ length: Math.max(0, e - s + 1) }, (_, i) => s + i); }
  loadItems(): void {
    this.isLoading.set(true);
    this.service.getToolingItems(this.pageNumber(), this.pageSize(), this.searchTerm).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => { const data = response.data as PagedResponse<ToolingItem> | undefined; this.items.set(data?.items ?? []); this.totalCount.set(data?.totalCount ?? 0); this.isLoading.set(false); },
      error: (error) => { this.isLoading.set(false); this.toastService.error(error?.error?.message || 'We could not load tooling items.', 'Items not loaded'); }
    });
  }
  onSearch(): void { this.pageNumber.set(1); this.loadItems(); }
  onPageChange(page: number): void { this.pageNumber.set(page); this.loadItems(); }
  exportCsv(): void {
    this.downloadCsv('tooling-items.csv', [['Item Code','Item Name','Customer','Location','Unit','Low Stock','Status'], ...this.items().map(x => [x.itemCode, x.itemName, `${x.customerName} (${x.customerCode})`, x.location || '', x.unit || '', String(x.lowStockThreshold), x.isActive ? 'Active' : 'Inactive'])]);
  }
  onDelete(item: ToolingItem): void {
    this.dialogService.showDelete('tooling item').then((confirmed) => {
      if (!confirmed) return;
      this.deletingId.set(item.correlationId);
      this.service.deleteToolingItem(item.correlationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.deletingId.set(null); this.toastService.success('Tooling item deleted.', 'Item deleted'); this.loadItems(); },
        error: (error) => { this.deletingId.set(null); this.toastService.error(error?.error?.message || 'We could not delete this item.', 'Delete failed'); }
      });
    });
  }
  getStatusBadge(isActive: boolean): { class: string; text: string } { return isActive ? { class: 'badge-success', text: 'Active' } : { class: 'badge-danger', text: 'Inactive' }; }
  getPhotoUrl(photoUrl?: string): string {
    if (!photoUrl) return '';
    if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
    return `${environment.apiBaseUrl.replace(/\/api\/?$/, '')}${photoUrl}`;
  }
  openPhoto(photoUrl?: string): void {
    if (photoUrl) this.previewPhotoUrl.set(this.getPhotoUrl(photoUrl));
  }
  closePhoto(): void {
    this.previewPhotoUrl.set(null);
  }
  private downloadCsv(fileName: string, rows: string[][]): void { const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); }
}
