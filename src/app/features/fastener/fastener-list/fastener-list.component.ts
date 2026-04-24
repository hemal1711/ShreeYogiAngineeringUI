import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Fastener, PagedResponse } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({ selector: 'app-fastener-list', standalone: true, imports: [CommonModule, FormsModule, RouterLink, BreadcrumbComponent], templateUrl: './fastener-list.component.html', styleUrl: './fastener-list.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class FastenerListComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(AccessControlService);
  private readonly permissionService = inject(PermissionService);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);
  readonly items = signal<Fastener[]>([]);
  readonly isLoading = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);
  readonly previewPhotoUrl = signal<string | null>(null);
  searchTerm = '';
  readonly canCreate = this.permissionService.has('fastener.create');
  readonly canUpdate = this.permissionService.has('fastener.update');
  readonly canDelete = this.permissionService.has('fastener.delete');
  constructor() { this.loadItems(); }
  get totalPages(): number { return Math.ceil(this.totalCount() / this.pageSize()); }
  get pageRange(): number[] { const s = Math.max(1, this.pageNumber() - 2); const e = Math.min(this.totalPages, s + 4); return Array.from({ length: Math.max(0, e - s + 1) }, (_, i) => s + i); }
  loadItems(): void { this.isLoading.set(true); this.service.getFasteners(this.pageNumber(), this.pageSize(), this.searchTerm).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => { const d = r.data as PagedResponse<Fastener> | undefined; this.items.set(d?.items ?? []); this.totalCount.set(d?.totalCount ?? 0); this.isLoading.set(false); }, error: e => { this.isLoading.set(false); this.toastService.error(e?.error?.message || 'We could not load fasteners.', 'Fasteners not loaded'); } }); }
  onSearch(): void { this.pageNumber.set(1); this.loadItems(); }
  onPageChange(page: number): void { this.pageNumber.set(page); this.loadItems(); }
  onDelete(item: Fastener): void { this.dialogService.showDelete('fastener').then(c => { if (!c) return; this.deletingId.set(item.correlationId); this.service.deleteFastener(item.correlationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.deletingId.set(null); this.toastService.success('Fastener deleted.', 'Deleted'); this.loadItems(); }, error: e => { this.deletingId.set(null); this.toastService.error(e?.error?.message || 'We could not delete this fastener.', 'Delete failed'); } }); }); }
  exportCsv(): void { const rows = [['Item Code','Item Name','Category','Size','Unit','Stock','Min Stock','Shop','Location','Status'], ...this.items().map(x => [x.itemCode, x.itemName, x.category || '', x.size || '', x.unit || '', String(x.currentStock), String(x.minimumStock), x.shopName || '', x.location || '', x.isActive ? 'Active' : 'Inactive'])]; this.downloadCsv('fasteners.csv', rows); }
  getPhotoUrl(photoUrl?: string): string { if (!photoUrl) return ''; if (/^https?:\/\//i.test(photoUrl)) return photoUrl; return `${environment.apiBaseUrl.replace(/\/api\/?$/, '')}${photoUrl}`; }
  openPhoto(photoUrl?: string): void { if (photoUrl) this.previewPhotoUrl.set(this.getPhotoUrl(photoUrl)); }
  closePhoto(): void { this.previewPhotoUrl.set(null); }
  stockClass(item: Fastener): string { return item.currentStock <= item.minimumStock ? 'text-danger' : 'text-success'; }
  private downloadCsv(fileName: string, rows: string[][]): void { const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); }
}
