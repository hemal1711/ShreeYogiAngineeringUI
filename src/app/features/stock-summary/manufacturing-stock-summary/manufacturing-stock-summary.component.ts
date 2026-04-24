import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Customer, ManufacturingItem, ManufacturingStockSummary, PagedResponse } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-manufacturing-stock-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './manufacturing-stock-summary.component.html',
  styleUrl: './manufacturing-stock-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManufacturingStockSummaryComponent {
  
  private readonly destroyRef = inject(DestroyRef);
private readonly service = inject(AccessControlService);
  private readonly toastService = inject(ToastService);
  readonly customers = signal<Customer[]>([]);
  readonly items = signal<ManufacturingItem[]>([]);
  readonly rows = signal<ManufacturingStockSummary[]>([]);
  readonly isLoading = signal(false);
  filter = { customerCorrelationId: '', itemCorrelationId: '' };
  readonly totals = computed(() => this.rows().reduce((acc, row) => ({
    received: acc.received + row.receivedQty,
    dispatched: acc.dispatched + row.dispatchedQty,
    rejected: acc.rejected + row.rejectedQty,
    inHand: acc.inHand + row.qtyInHand
  }), { received: 0, dispatched: 0, rejected: 0, inHand: 0 }));
  constructor() { this.loadLookups(); this.loadRows(); }
  loadLookups(): void { this.service.getCustomers(1, 200).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r => this.customers.set((r.data as PagedResponse<Customer> | undefined)?.items ?? [])); this.service.getManufacturingItems(1, 200).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r => this.items.set((r.data as PagedResponse<ManufacturingItem> | undefined)?.items ?? [])); }
  loadRows(): void { this.isLoading.set(true); this.service.getManufacturingStockSummary({ customerCorrelationId: this.filter.customerCorrelationId, itemCorrelationId: this.filter.itemCorrelationId }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => { this.rows.set(r.data ?? []); this.isLoading.set(false); }, error: e => { this.isLoading.set(false); this.toastService.error(e?.error?.message || 'We could not load stock summary.', 'Stock not loaded'); } }); }
  exportCsv(): void { const rows = [['Item Code','Item Name','Customer','Received Qty','Dispatched Qty','Rejected Qty','Qty In Hand'], ...this.rows().map(x => [x.itemCode, x.itemName, x.customerCode, String(x.receivedQty), String(x.dispatchedQty), String(x.rejectedQty), String(x.qtyInHand)])]; this.downloadCsv('manufacturing-stock-summary.csv', rows); }
  format(value: number): string { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value); }
  tone(value: number): string { return value < 0 ? 'is-danger' : 'is-success'; }
  private downloadCsv(fileName: string, rows: string[][]): void { const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); }
}
