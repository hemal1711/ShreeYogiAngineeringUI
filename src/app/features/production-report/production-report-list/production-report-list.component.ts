import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Customer,
  MachineType,
  ManufacturingItem,
  PagedResponse,
  ProductionReport,
  ProductionReportFilter
} from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-production-report-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './production-report-list.component.html',
  styleUrl: './production-report-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductionReportListComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(AccessControlService);
  private readonly permissionService = inject(PermissionService);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);

  readonly reports = signal<ProductionReport[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly items = signal<ManufacturingItem[]>([]);
  readonly machineTypes = signal<MachineType[]>([]);
  readonly isLoading = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);

  filter: ProductionReportFilter = {
    customerCorrelationId: '',
    itemCorrelationId: '',
    machineType: '',
    reportDateFrom: '',
    reportDateTo: '',
    search: ''
  };

  readonly canCreate = this.permissionService.hasAll(['productionreport.create', 'machinetype.read', 'machinename.read']);
  readonly canUpdate = this.permissionService.hasAll(['productionreport.update', 'machinetype.read', 'machinename.read']);
  readonly canDelete = this.permissionService.has('productionreport.delete');

  constructor() {
    this.loadLookups();
    this.loadReports();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize());
  }

  get pageRange(): number[] {
    const start = Math.max(1, this.pageNumber() - 2);
    const end = Math.min(this.totalPages, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }

  loadLookups(): void {
    this.service.getCustomers(1, 200).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((response) => {
      this.customers.set((response.data as PagedResponse<Customer> | undefined)?.items ?? []);
    });

    this.service.getManufacturingItems(1, 200).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((response) => {
      this.items.set((response.data as PagedResponse<ManufacturingItem> | undefined)?.items ?? []);
    });

    this.service.getMachineTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((response) => {
      this.machineTypes.set((response.data as MachineType[] | undefined) ?? []);
    });
  }

  loadReports(): void {
    this.isLoading.set(true);
    this.service.getProductionReports(this.pageNumber(), this.pageSize(), this.filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const data = response.data as PagedResponse<ProductionReport> | undefined;
          this.reports.set(data?.items ?? []);
          this.totalCount.set(data?.totalCount ?? 0);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.toastService.error(error?.error?.message || 'We could not load production reports.', 'Reports not loaded');
        }
      });
  }

  onFilter(): void {
    this.pageNumber.set(1);
    this.loadReports();
  }

  onPageChange(page: number): void {
    this.pageNumber.set(page);
    this.loadReports();
  }

  onDelete(report: ProductionReport): void {
    this.dialogService.showDelete('production report').then((confirmed) => {
      if (!confirmed) return;

      this.deletingId.set(report.correlationId);
      this.service.deleteProductionReport(report.correlationId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.deletingId.set(null);
            this.toastService.success('Production report deleted.', 'Deleted');
            this.loadReports();
          },
          error: (error) => {
            this.deletingId.set(null);
            this.toastService.error(error?.error?.message || 'We could not delete this report.', 'Delete failed');
          }
        });
    });
  }

  exportCsv(): void {
    const rows = [
      ['Date', 'Status', 'Machine Type', 'Machine Name', 'Shift', 'Item Code', 'Customer', 'OK Qty', 'Rejected Qty', 'Slots'],
      ...this.reports().map((report) => [
        this.formatDate(report.reportDate),
        report.reportStatus || 'Open',
        report.machineType,
        report.machineName,
        report.shiftName,
        report.itemCode,
        report.customerCode,
        String(report.totalOkQuantity),
        String(report.totalRejectedQuantity),
        String(report.entries.length)
      ])
    ];

    const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'production-reports.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  formatDate(value: string): string {
    return value ? value.slice(0, 10) : '';
  }

  formatTime(value: string): string {
    return value?.slice(0, 5) || '';
  }

  slotSummary(report: ProductionReport): string {
    return report.entries.map((entry) => `${this.formatTime(entry.fromTime)}-${this.formatTime(entry.toTime)}`).join(', ');
  }

  statusClass(status: string | null | undefined): string {
    const value = (status || 'Open').toLowerCase();
    return value === 'completed' ? 'badge-success' : value === 'cancelled' ? 'badge-danger' : 'badge-info';
  }
}
