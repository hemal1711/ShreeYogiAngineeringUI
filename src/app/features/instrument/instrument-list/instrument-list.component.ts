import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Instrument, PagedResponse } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({ selector: 'app-instrument-list', standalone: true, imports: [CommonModule, FormsModule, RouterLink, BreadcrumbComponent], templateUrl: './instrument-list.component.html', styleUrl: './instrument-list.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class InstrumentListComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(AccessControlService);
  private readonly permissionService = inject(PermissionService);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);
  readonly items = signal<Instrument[]>([]);
  readonly isLoading = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);
  readonly previewPhotoUrl = signal<string | null>(null);
  searchTerm = '';
  readonly canCreate = this.permissionService.has('instrument.create');
  readonly canUpdate = this.permissionService.has('instrument.update');
  readonly canDelete = this.permissionService.has('instrument.delete');
  constructor() { this.loadItems(); }
  get totalPages(): number { return Math.ceil(this.totalCount() / this.pageSize()); }
  get pageRange(): number[] { const s = Math.max(1, this.pageNumber() - 2); const e = Math.min(this.totalPages, s + 4); return Array.from({ length: Math.max(0, e - s + 1) }, (_, i) => s + i); }
  get overdueCount(): number { const today = new Date().toISOString().slice(0, 10); return this.items().filter(x => x.calibrationDueDate && x.calibrationDueDate.slice(0, 10) < today).length; }
  loadItems(): void { this.isLoading.set(true); this.service.getInstruments(this.pageNumber(), this.pageSize(), this.searchTerm).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => { const d = r.data as PagedResponse<Instrument> | undefined; this.items.set(d?.items ?? []); this.totalCount.set(d?.totalCount ?? 0); this.isLoading.set(false); }, error: e => { this.isLoading.set(false); this.toastService.error(e?.error?.message || 'We could not load instruments.', 'Instruments not loaded'); } }); }
  onSearch(): void { this.pageNumber.set(1); this.loadItems(); }
  onPageChange(page: number): void { this.pageNumber.set(page); this.loadItems(); }
  onDelete(item: Instrument): void { this.dialogService.showDelete('instrument').then(c => { if (!c) return; this.deletingId.set(item.correlationId); this.service.deleteInstrument(item.correlationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.deletingId.set(null); this.toastService.success('Instrument deleted.', 'Deleted'); this.loadItems(); }, error: e => { this.deletingId.set(null); this.toastService.error(e?.error?.message || 'We could not delete this instrument.', 'Delete failed'); } }); }); }
  exportCsv(): void { const rows = [['Code','Instrument','Category','Make','Serial No','Calibration Due','Stock','Location','Status'], ...this.items().map(x => [x.code, x.instrumentName, x.category || '', x.makeBrand || '', x.serialNo || '', this.formatDate(x.calibrationDueDate), String(x.currentStock), x.location || '', x.isActive ? 'Active' : 'Inactive'])]; this.downloadCsv('instruments.csv', rows); }
  formatDate(value?: string): string { return value ? value.slice(0, 10) : ''; }
  getPhotoUrl(photoUrl?: string): string { if (!photoUrl) return ''; if (/^https?:\/\//i.test(photoUrl)) return photoUrl; return `${environment.apiBaseUrl.replace(/\/api\/?$/, '')}${photoUrl}`; }
  openPhoto(photoUrl?: string): void { if (photoUrl) this.previewPhotoUrl.set(this.getPhotoUrl(photoUrl)); }
  closePhoto(): void { this.previewPhotoUrl.set(null); }
  private downloadCsv(fileName: string, rows: string[][]): void { const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); }
}
