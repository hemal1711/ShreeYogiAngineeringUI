import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PagedResponse, ToolingItem, ToolingStockSummary } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-tooling-stock-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './tooling-stock-summary.component.html',
  styleUrl: './tooling-stock-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolingStockSummaryComponent {
  
  private readonly destroyRef = inject(DestroyRef);
private readonly service = inject(AccessControlService);
  private readonly toastService = inject(ToastService);
  readonly items = signal<ToolingItem[]>([]);
  readonly rows = signal<ToolingStockSummary[]>([]);
  readonly isLoading = signal(false);
  filter = { itemCorrelationId: '', location: '' };
  readonly locations = computed(() => Array.from(new Set(this.items().map(x => x.location).filter(Boolean) as string[])).sort());
  readonly cards = computed(() => ({ inStock: this.rows().filter(x => x.status === 'In Stock').length, low: this.rows().filter(x => x.status === 'Low Stock').length, out: this.rows().filter(x => x.status === 'Out').length }));
  constructor() { this.loadLookups(); this.loadRows(); }
  loadLookups(): void { this.service.getToolingItems(1, 200).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r => this.items.set((r.data as PagedResponse<ToolingItem> | undefined)?.items ?? [])); }
  loadRows(): void { this.isLoading.set(true); this.service.getToolingStockSummary(this.filter).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => { this.rows.set(r.data ?? []); this.isLoading.set(false); }, error: e => { this.isLoading.set(false); this.toastService.error(e?.error?.message || 'We could not load stock summary.', 'Stock not loaded'); } }); }
  exportCsv(): void { const rows = [['Item Code','Item Name','Location','Received','Used','In Hand','Status'], ...this.rows().map(x => [x.itemCode, x.itemName, x.location || '', String(x.receivedQty), String(x.usedQty), String(x.qtyInHand), x.status])]; this.downloadCsv('tooling-stock-summary.csv', rows); }
  format(value: number): string { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value); }
  statusClass(status: string): string { return status === 'Out' ? 'badge-danger' : status === 'Low Stock' ? 'badge-warning' : 'badge-success'; }
  private downloadCsv(fileName: string, rows: string[][]): void { const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); }
}
