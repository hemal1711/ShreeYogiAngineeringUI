import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Instrument, InstrumentIssue, InstrumentIssueFilter, PagedResponse } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({ selector: 'app-instrument-issue-list', standalone: true, imports: [CommonModule, FormsModule, RouterLink, BreadcrumbComponent], templateUrl: './instrument-issue-list.component.html', styleUrl: './instrument-issue-list.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class InstrumentIssueListComponent {
  private readonly destroyRef = inject(DestroyRef); private readonly service = inject(AccessControlService); private readonly permissionService = inject(PermissionService); private readonly dialogService = inject(ConfirmationDialogService); private readonly toastService = inject(ToastService);
  readonly issues = signal<InstrumentIssue[]>([]); readonly instruments = signal<Instrument[]>([]); readonly isLoading = signal(false); readonly deletingId = signal<string | null>(null); readonly pageNumber = signal(1); readonly pageSize = signal(10); readonly totalCount = signal(0); readonly previewPhotoUrl = signal<string | null>(null); readonly statuses = ['Issued', 'Returned'];
  filter: InstrumentIssueFilter = { instrumentCorrelationId: '', status: '', dateFrom: '', dateTo: '', search: '' };
  readonly canCreate = this.permissionService.has('instrumentissue.create'); readonly canUpdate = this.permissionService.has('instrumentissue.update'); readonly canDelete = this.permissionService.has('instrumentissue.delete');
  constructor() { this.loadLookups(); this.loadIssues(); }
  get totalPages(): number { return Math.ceil(this.totalCount() / this.pageSize()); }
  get pageRange(): number[] { const s = Math.max(1, this.pageNumber() - 2); const e = Math.min(this.totalPages, s + 4); return Array.from({ length: Math.max(0, e - s + 1) }, (_, i) => s + i); }
  get pendingCount(): number { return this.issues().filter(x => x.status === 'Issued').length; }
  loadLookups(): void { this.service.getInstruments(1, 500).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r => this.instruments.set((r.data as PagedResponse<Instrument> | undefined)?.items ?? [])); }
  loadIssues(): void { this.isLoading.set(true); this.service.getInstrumentIssues(this.pageNumber(), this.pageSize(), this.filter).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => { const d = r.data as PagedResponse<InstrumentIssue> | undefined; this.issues.set(d?.items ?? []); this.totalCount.set(d?.totalCount ?? 0); this.isLoading.set(false); }, error: e => { this.isLoading.set(false); this.toastService.error(e?.error?.message || 'We could not load instrument issues.', 'Issues not loaded'); } }); }
  onFilter(): void { this.pageNumber.set(1); this.loadIssues(); }
  onPageChange(page: number): void { this.pageNumber.set(page); this.loadIssues(); }
  onDelete(issue: InstrumentIssue): void { this.dialogService.showDelete('instrument issue').then(c => { if (!c) return; this.deletingId.set(issue.correlationId); this.service.deleteInstrumentIssue(issue.correlationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.deletingId.set(null); this.toastService.success('Instrument issue deleted.', 'Deleted'); this.loadIssues(); }, error: e => { this.deletingId.set(null); this.toastService.error(e?.error?.message || 'We could not delete this issue.', 'Delete failed'); } }); }); }
  exportCsv(): void { const rows = [['Code','Instrument','Issued To','Department','Issue Date','Return Date','Status','Remarks'], ...this.issues().map(x => [x.code, x.instrumentName, x.issuedTo, x.department || '', this.formatDate(x.issueDate), this.formatDate(x.returnDate), x.status, x.remarks || ''])]; const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = 'instrument-issues.csv'; a.click(); URL.revokeObjectURL(url); }
  formatDate(value?: string): string { return value ? value.slice(0, 10) : ''; }
  badgeClass(status: string): string { return status === 'Returned' ? 'badge-success' : 'badge-warning'; }
  getPhotoUrl(photoUrl?: string): string { if (!photoUrl) return ''; if (/^https?:\/\//i.test(photoUrl)) return photoUrl; return `${environment.apiBaseUrl.replace(/\/api\/?$/, '')}${photoUrl}`; }
  openPhoto(photoUrl?: string): void { if (photoUrl) this.previewPhotoUrl.set(this.getPhotoUrl(photoUrl)); }
  closePhoto(): void { this.previewPhotoUrl.set(null); }
}
