import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import {
  MachineName,
  MachineType,
  ManufacturingItem,
  PagedResponse,
  ProductionReport,
  ProductionReportEntry,
  ProductionReportRequest,
  User
} from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

interface ProductionSummary {
  presenceHours: number;
  actualWorkingHours: number;
  totalProduction: number;
  okQuantity: number;
  rejectedQuantity: number;
  expectedQuantity: number;
  differenceQuantity: number;
  shortageQuantity: number;
  extraQuantity: number;
  achievementStatus: string;
  rejectPercent: number;
  efficiencyPercent: number;
  runningHours: number;
  lunchBreakMinutes: number;
  dinnerBreakMinutes: number;
  setupMinutes: number;
  idleMinutes: number;
  machineBreakdownMinutes: number;
  toolBreakdownMinutes: number;
  totalBreakdownMinutes: number;
  totalDowntimeMinutes: number;
  timeStatus: string;
  productionVariancePercent;
}

@Component({
  selector: 'app-production-report-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BreadcrumbComponent],
  templateUrl: './production-report-form.component.html',
  styleUrl: './production-report-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductionReportFormComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AccessControlService);
  private readonly authService = inject(AuthService);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);

  readonly items = signal<ManufacturingItem[]>([]);
  readonly machineTypeOptions = signal<MachineType[]>([]);
  readonly machineNameOptions = signal<MachineName[]>([]);
  readonly users = signal<User[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly savingEntryIndex = signal<number | null>(null);
  readonly unlockingEntryId = signal<string | null>(null);
  readonly isCompleting = signal(false);
  readonly correlationId = signal<string | null>(null);
  readonly pageTitle = signal('Add Production Report');
  readonly reportStatus = signal('Open');
  readonly formVersion = signal(0);
  readonly canManageHeader = this.permissionService.has('productionreport.manage');
  readonly canCreateReport = this.permissionService.has('productionreport.create');
  readonly canUpdateReport = this.permissionService.has('productionreport.update');
  readonly canReopenMissedEntries = this.permissionService.has('productionreport.missed.reopen');
  readonly canReadUsers = this.permissionService.has('user.read');
  readonly canReadManufacturingItems = this.permissionService.has('manufacturingitem.read');

  readonly shifts = ['Day Shift', 'Night Shift'];
  readonly rejectReasons = ['Size Issue', 'Surface Issue', 'Tool Break', 'Machine Vibration', 'Other'];
  readonly idleReasons = ['Tool Change', 'Power Cut', 'Machine Breakdown', 'Material Not Available', 'Setting Time'];

  readonly form = this.fb.group({
    manufacturingItemCorrelationId: ['', Validators.required],
    machineType: ['', Validators.required],
    machineName: ['', [Validators.required, Validators.maxLength(100)]],
    shiftName: ['', Validators.required],
    reportDate: [this.today(), Validators.required],
    jobName: ['', Validators.maxLength(200)],
    operatorUserCorrelationId: ['', Validators.required],
    operatorInTime: ['', Validators.required],
    operatorOutTime: [''],
    lunchOutTime: [''],
    lunchInTime: [''],
    dinnerOutTime: [''],
    dinnerInTime: [''],
    setupStartTime: [''],
    setupEndTime: [''],
    cycleTimeMinutes: [null as number | null, [Validators.min(0.01)]],
    loadUnloadTimeMinutes: [null as number | null, [Validators.min(0)]],
    partsPerCycle: [1 as number | null, [Validators.min(1)]],
    perHourQuantity: [{ value: 0, disabled: true }],
    idleMinutes: [null as number | null, [Validators.min(0)]],
    idleReason: [''],
    machineBreakdownMinutes: [null as number | null, [Validators.min(0)]],
    toolBreakdownMinutes: [null as number | null, [Validators.min(0)]],
    remarks: ['', Validators.maxLength(1000)],
    entries: this.fb.array([])
  });

  readonly machineNames = computed(() => {
    this.formVersion();
    return this.machineNameOptions().filter((item) => item.machineType === this.form.controls.machineType.value);
  });

  readonly summary = computed<ProductionSummary>(() => {
    this.formVersion();
    return this.calculateSummary();
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.correlationId.set(id);
      this.pageTitle.set('Edit Production Report');
    }

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.syncPerHourQuantity();
      this.formVersion.update((value) => value + 1);
    });

    this.form.controls.machineType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((machineType) => {
      const names = this.machineNameOptions().filter((item) => item.machineType === machineType);
      if (!names.some((item) => item.name === this.form.controls.machineName.value)) {
        this.form.controls.machineName.setValue(names[0]?.name ?? '');
      }
    });

    this.loadPage(id);
  }

  get entriesArray(): FormArray<FormGroup> {
    return this.form.get('entries') as FormArray<FormGroup>;
  }

  addManualEntry(): void {
    const last = this.entriesArray.at(this.entriesArray.length - 1)?.getRawValue();
    const fromTime = last?.toTime || this.form.controls.operatorInTime.value || '';
    this.entriesArray.push(this.createEntryGroup({ fromTime, toTime: this.addOneHour(fromTime), okQuantity: 0, rejectedQuantity: 0 }));
    this.form.markAsDirty();
    this.formVersion.update((value) => value + 1);
  }

  onSubmit(): void {
    if (!this.canEditHeader()) {
      this.toastService.warning('Only admin can save production report header.', 'Admin required');
      return;
    }

    if (!this.validateHeader(true) || this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.warning('Please complete required production report fields.', 'Report needs attention');
      return;
    }

    const request = this.buildHeaderRequest();
    const id = this.correlationId();
    this.isSubmitting.set(true);
    const operation = id ? this.service.updateProductionReport(id, request) : this.service.createProductionReport(request);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const report = response.data as ProductionReport | undefined;
        this.isSubmitting.set(false);
        this.toastService.success(id ? 'Production report updated.' : 'Production report started.', 'Saved');
        if (!id && report?.correlationId) {
          this.router.navigate(['/production-reports/edit', report.correlationId]);
          return;
        }
        if (report) this.applyReport(report);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error?.error?.message || 'We could not save this production report.', 'Save failed');
      }
    });
  }

  saveEntry(index: number): void {
    const reportId = this.correlationId();
    if (!reportId) {
      this.toastService.warning('Save the report header before adding hourly entries.', 'Save report first');
      return;
    }

    const group = this.entriesArray.at(index);
    if (!group) return;

    if (group.invalid) {
      group.markAllAsTouched();
      this.toastService.warning('Complete the hourly entry before saving.', 'Entry needs attention');
      return;
    }

    const beforeSaveValue = group.getRawValue();
    const request = this.entryRequest(group);

    this.savingEntryIndex.set(index);

    this.service.saveProductionReportEntry(reportId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.savingEntryIndex.set(null);
          this.toastService.success('Hourly entry saved and locked.', 'Entry locked');

          if (response.data) {
            this.applyReport(response.data as ProductionReport);
          }

          const targetIndex = this.findEntryIndexAfterSave(beforeSaveValue, index);
          this.setEntryLockState(targetIndex, true);
        },
        error: (error) => {
          this.savingEntryIndex.set(null);
          this.toastService.error(error?.error?.message || 'We could not save this hourly entry.', 'Entry save failed');
          this.refreshUi();
        }
      });
  }

  unlockEntry(index: number): void {
    if (!this.canReopenMissedEntries) {
      this.toastService.warning('Only admin can reopen locked or missed entries.', 'Admin required');
      return;
    }

    const reportId = this.correlationId();
    const entryId = this.entriesArray.at(index)?.getRawValue()?.correlationId;
    if (!reportId || !entryId) return;

    this.unlockingEntryId.set(entryId);

    const operation = this.isMissedEntry(index)
      ? this.service.reopenMissedProductionReportEntry(reportId, entryId)
      : this.service.unlockProductionReportEntry(reportId, entryId);

    operation
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.unlockingEntryId.set(null);
          this.toastService.success(this.isMissedEntry(index) ? 'Missed hourly entry reopened.' : 'Hourly entry unlocked.', 'Unlocked');

          if (response.data) {
            this.applyReport(response.data as ProductionReport);
          }

          const targetIndex = this.entriesArray.controls.findIndex(control => control.getRawValue().correlationId === entryId);
          this.setEntryLockState(targetIndex >= 0 ? targetIndex : index, false);
        },
        error: (error) => {
          this.unlockingEntryId.set(null);
          this.toastService.error(error?.error?.message || 'We could not unlock this entry.', 'Unlock failed');
          this.refreshUi();
        }
      });
  }

  completeReport(): void {
    const reportId = this.correlationId();
    if (!reportId) return;
    if (!this.form.controls.operatorOutTime.value) {
      this.form.controls.operatorOutTime.markAsTouched();
      this.toastService.warning('Operator out time is required to complete report.', 'Out time required');
      return;
    }

    this.isCompleting.set(true);
    this.service.completeProductionReport(reportId, this.withSeconds(this.form.controls.operatorOutTime.value))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isCompleting.set(false);
          this.toastService.success('Production report completed.', 'Completed');
          if (response.data) this.applyReport(response.data as ProductionReport);
        },
        error: (error) => {
          this.isCompleting.set(false);
          this.toastService.error(error?.error?.message || 'We could not complete this report.', 'Complete failed');
        }
      });
  }

  onCancel(): void {
    if (!this.form.dirty) {
      this.router.navigate(['/production-reports']);
      return;
    }

    this.dialogService.showWarning('Unsaved Changes', 'You have unsaved changes.', 'Discard these changes and leave?')
      .then((confirmed) => {
        if (confirmed) this.router.navigate(['/production-reports']);
      });
  }

  isFieldInvalid(name: string): boolean {
    const field = this.form.get(name);
    return !!(field?.invalid && field.touched);
  }

  isEntryLocked(index: number): boolean {
    return this.isLockedGroup(this.entriesArray.at(index));
  }

  entryDisplayStatus(index: number): string {
    const value = this.entriesArray.at(index).getRawValue();
    if (String(value.entryStatus ?? '').toLowerCase() === 'missed') return 'Missed';
    if (this.isEntryLocked(index)) return 'Locked';
    return value.correlationId ? 'Unlocked' : 'Pending';
  }

  statusClass(status: string | null | undefined): string {
    const value = (status || 'Open').toLowerCase();
    if (value === 'completed' || value === 'unlocked') return 'badge-success';
    if (value === 'cancelled' || value === 'missed') return 'badge-danger';
    return 'badge-info';
  }

  metricTone(value: number, goodAt: number, warnAt: number): string {
    if (value >= goodAt) return 'good';
    if (value >= warnAt) return 'warn';
    return 'danger';
  }

  userDisplayName(user: User): string {
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.userName;
  }

  canEditHeader(): boolean {
    return this.canManageHeader || (!this.correlationId() && this.canCreateReport) || (!!this.correlationId() && this.canUpdateReport);
  }

  private createEntryGroup(entry?: Partial<ProductionReportEntry>): FormGroup {
    const locked = this.isLockedEntry(entry);
    const group = this.fb.group({
      correlationId: [entry?.correlationId ?? null],
      fromTime: [{ value: entry?.fromTime?.slice(0, 5) ?? '', disabled: locked }, Validators.required],
      toTime: [{ value: entry?.toTime?.slice(0, 5) ?? '', disabled: locked }, Validators.required],
      okQuantity: [{ value: entry?.okQuantity ?? 0, disabled: locked }, [Validators.required, Validators.min(0)]],
      rejectedQuantity: [{ value: entry?.rejectedQuantity ?? 0, disabled: locked }, [Validators.required, Validators.min(0)]],
      rejectReason: [{ value: entry?.rejectReason ?? '', disabled: locked }],
      remarks: [{ value: entry?.remarks ?? '', disabled: locked }, Validators.maxLength(500)],
      entryStatus: [locked ? 'Locked' : entry?.correlationId ? 'Submitted' : 'Pending'],
      submittedAt: [entry?.submittedAt ?? null],
      lockedAt: [entry?.lockedAt ?? null]
    });
    this.applyEntryControlState(group, locked);
    return group;
  }

  private loadPage(id: string | null): void {
    this.isLoading.set(true);
    forkJoin({
      items: this.canReadManufacturingItems ? this.service.getManufacturingItems(1, 200) : this.service.getProductionReportItemLookups(),
      machineTypes: this.service.getMachineTypes(),
      machineNames: this.service.getMachineNames(),
      users: this.canReadUsers ? this.service.getUsers(1, 200) : of(null)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ items, machineTypes, machineNames, users }) => {
          this.items.set(this.resolveItems(items?.data));
          this.machineTypeOptions.set((machineTypes.data as MachineType[] | undefined) ?? []);
          this.machineNameOptions.set((machineNames.data as MachineName[] | undefined) ?? []);
          this.users.set(this.canReadUsers
            ? (users?.data as PagedResponse<User> | undefined)?.items ?? []
            : this.currentUserAsOperatorList());
          this.applyHeaderControlState();
          id ? this.loadReport(id) : this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.toastService.error(error?.error?.message || 'We could not load report data.', 'Data not loaded');
        }
      });
  }

  private loadReport(id: string): void {
    this.service.getProductionReport(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const report = response.data as ProductionReport | undefined;
          if (report) this.applyReport(report);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.toastService.error(error?.error?.message || 'We could not load this production report.', 'Report not loaded');
        }
      });
  }

  private applyReport(report: ProductionReport): void {
    this.correlationId.set(report.correlationId);
    this.reportStatus.set(report.reportStatus ?? 'Open');
    this.form.patchValue({
      manufacturingItemCorrelationId: report.manufacturingItemCorrelationId,
      machineType: report.machineType,
      machineName: report.machineName,
      shiftName: report.shiftName,
      reportDate: this.today(report.reportDate),
      jobName: report.jobName ?? '',
      operatorUserCorrelationId: report.operatorUserCorrelationId ?? '',
      operatorInTime: report.operatorInTime?.slice(0, 5) ?? '',
      operatorOutTime: report.operatorOutTime?.slice(0, 5) ?? '',
      lunchOutTime: report.lunchOutTime?.slice(0, 5) ?? '',
      lunchInTime: report.lunchInTime?.slice(0, 5) ?? '',
      dinnerOutTime: report.dinnerOutTime?.slice(0, 5) ?? '',
      dinnerInTime: report.dinnerInTime?.slice(0, 5) ?? '',
      setupStartTime: report.setupStartTime?.slice(0, 5) ?? '',
      setupEndTime: report.setupEndTime?.slice(0, 5) ?? '',
      cycleTimeMinutes: report.cycleTimeMinutes ?? null,
      loadUnloadTimeMinutes: report.loadUnloadTimeMinutes ?? null,
      partsPerCycle: report.partsPerCycle ?? 1,
      idleMinutes: report.idleMinutes ?? null,
      idleReason: report.idleReason ?? '',
      machineBreakdownMinutes: report.machineBreakdownMinutes ?? null,
      toolBreakdownMinutes: report.toolBreakdownMinutes ?? null,
      remarks: report.remarks ?? ''
    });

    this.ensureCurrentReportLookups(report);
    this.applyHeaderControlState();

    this.entriesArray.clear();
    report.entries.forEach((entry) => this.entriesArray.push(this.createEntryGroup(this.normalizeEntry(entry))));
    this.syncPerHourQuantity();
    this.form.markAsPristine();
    this.refreshUi();
  }

  private buildHeaderRequest(): ProductionReportRequest {
    const raw = this.form.getRawValue();
    return {
      manufacturingItemCorrelationId: raw.manufacturingItemCorrelationId || '',
      machineType: raw.machineType || '',
      machineName: raw.machineName?.trim() || '',
      shiftName: raw.shiftName || '',
      reportDate: raw.reportDate || this.today(),
      jobName: raw.jobName?.trim() || undefined,
      operatorUserCorrelationId: raw.operatorUserCorrelationId || null,
      operatorInTime: this.withSeconds(raw.operatorInTime),
      operatorOutTime: this.withSeconds(raw.operatorOutTime),
      lunchOutTime: this.withSeconds(raw.lunchOutTime),
      lunchInTime: this.withSeconds(raw.lunchInTime),
      dinnerOutTime: this.withSeconds(raw.dinnerOutTime),
      dinnerInTime: this.withSeconds(raw.dinnerInTime),
      setupStartTime: this.withSeconds(raw.setupStartTime),
      setupEndTime: this.withSeconds(raw.setupEndTime),
      cycleTimeMinutes: this.toNullableNumber(raw.cycleTimeMinutes),
      loadUnloadTimeMinutes: this.toNullableNumber(raw.loadUnloadTimeMinutes),
      partsPerCycle: this.toNullableNumber(raw.partsPerCycle),
      perHourQuantity: this.toNullableNumber(raw.perHourQuantity),
      hourlyEntryMode: 'Manual Hourly Entry',
      reportStatus: this.reportStatus(),
      idleMinutes: this.toNullableNumber(raw.idleMinutes),
      idleReason: raw.idleReason?.trim() || undefined,
      machineBreakdownMinutes: this.toNullableNumber(raw.machineBreakdownMinutes),
      toolBreakdownMinutes: this.toNullableNumber(raw.toolBreakdownMinutes),
      remarks: raw.remarks?.trim() || undefined,
      entries: []
    };
  }

  private entryRequest(group: AbstractControl): ProductionReportEntry {
    const raw = group.getRawValue();
    return {
      correlationId: raw.correlationId ?? undefined,
      fromTime: this.withSeconds(raw.fromTime) || '00:00:00',
      toTime: this.withSeconds(raw.toTime) || '00:00:00',
      okQuantity: Number(raw.okQuantity || 0),
      rejectedQuantity: Number(raw.rejectedQuantity || 0),
      rejectReason: raw.rejectReason?.trim() || undefined,
      remarks: raw.remarks?.trim() || undefined
    };
  }

  private findEntryIndexAfterSave(oldValue: any, fallbackIndex: number): number {
    const index = this.entriesArray.controls.findIndex((control) => {
      const value = control.getRawValue();

      if (oldValue?.correlationId && value.correlationId === oldValue.correlationId) {
        return true;
      }

      return value.fromTime === oldValue?.fromTime && value.toTime === oldValue?.toTime;
    });

    return index >= 0 ? index : fallbackIndex;
  }

  private setEntryLockState(index: number, locked: boolean): void {
    if (index < 0 || index >= this.entriesArray.length) return;

    const group = this.entriesArray.at(index);
    if (!group) return;

    group.patchValue({
      entryStatus: locked ? 'Locked' : 'Unlocked',
      lockedAt: locked ? new Date().toISOString() : null
    }, { emitEvent: false });

    this.applyEntryControlState(group, locked);
    group.markAsPristine();
    group.markAsUntouched();
    this.refreshUi();
  }

  private refreshUi(): void {
    this.formVersion.update((value) => value + 1);
    this.cdr.detectChanges();
  }

  private applyEntryControlState(group: FormGroup, locked: boolean): void {
    const editableControls = [
      'fromTime',
      'toTime',
      'okQuantity',
      'rejectedQuantity',
      'rejectReason',
      'remarks'
    ];

    editableControls.forEach((name) => {
      const control = group.get(name);
      if (!control) return;

      if (locked) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }

      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  private isLockedGroup(group: FormGroup): boolean {
    return this.reportStatus() === 'Completed' || !!group.getRawValue().lockedAt;
  }

  private isLockedEntry(entry?: Partial<ProductionReportEntry>): boolean {
    return this.reportStatus() === 'Completed' || !!entry?.lockedAt;
  }

  private isMissedEntry(index: number): boolean {
    return String(this.entriesArray.at(index)?.getRawValue()?.entryStatus ?? '').toLowerCase() === 'missed';
  }

  private applyHeaderControlState(): void {
    const headerControls = [
      'manufacturingItemCorrelationId',
      'machineType',
      'machineName',
      'shiftName',
      'reportDate',
      'jobName',
      'operatorUserCorrelationId',
      'operatorInTime',
      'operatorOutTime',
      'lunchOutTime',
      'lunchInTime',
      'dinnerOutTime',
      'dinnerInTime',
      'setupStartTime',
      'setupEndTime',
      'cycleTimeMinutes',
      'loadUnloadTimeMinutes',
      'partsPerCycle',
      'idleMinutes',
      'idleReason',
      'machineBreakdownMinutes',
      'toolBreakdownMinutes',
      'remarks'
    ];

    headerControls.forEach((name) => {
      const control = this.form.get(name);
      if (!control) return;
      this.canEditHeader()
        ? control.enable({ emitEvent: false })
        : control.disable({ emitEvent: false });
    });

    this.form.controls.perHourQuantity.disable({ emitEvent: false });
  }

  private ensureCurrentReportLookups(report: ProductionReport): void {
    if (!this.items().some((item) => item.correlationId === report.manufacturingItemCorrelationId)) {
      this.items.set([
        ...this.items(),
        {
          correlationId: report.manufacturingItemCorrelationId,
          itemCode: report.itemCode,
          itemName: report.itemName,
          customerCorrelationId: report.customerCorrelationId,
          customerName: report.customerName,
          customerCode: report.customerCode,
          lowStockThreshold: 0,
          isActive: true,
          createdOn: report.createdOn
        }
      ]);
    }

    if (report.operatorUserCorrelationId && !this.users().some((user) => user.correlationId === report.operatorUserCorrelationId)) {
      this.users.set([
        ...this.users(),
        {
          correlationId: report.operatorUserCorrelationId,
          userName: report.operatorName || 'operator',
          firstName: report.operatorName || 'Operator',
          isActive: true,
          createdOn: report.createdOn
        }
      ]);
    }
  }

  private currentUserAsOperatorList(): User[] {
    const user = this.authService.currentUser();
    if (!user) return [];

    return [{
      correlationId: user.userCorrelationId,
      userName: user.userName,
      email: user.email,
      firstName: user.fullName || user.userName,
      phoneNumber: user.phoneNumber,
      isActive: true,
      createdOn: new Date().toISOString()
    }];
  }

  private resolveItems(data: unknown): ManufacturingItem[] {
    if (!data) return [];
    if (Array.isArray(data)) return data as ManufacturingItem[];
    return (data as PagedResponse<ManufacturingItem>).items ?? [];
  }

  private normalizeEntry(entry: ProductionReportEntry): ProductionReportEntry {
    if (!entry.lockedAt && String(entry.entryStatus ?? '').toLowerCase() === 'locked') {
      return { ...entry, entryStatus: 'Submitted' };
    }
    return entry;
  }

  private calculateSummary(): ProductionSummary {
    const presenceMinutes = this.productionPresenceMinutes();

    const lunchBreakMinutes = this.minutesBetween('lunchOutTime', 'lunchInTime');
    const dinnerBreakMinutes = this.minutesBetween('dinnerOutTime', 'dinnerInTime');
    const setupMinutes = this.minutesBetween('setupStartTime', 'setupEndTime');

    const idleMinutes = this.numberValue('idleMinutes');
    const machineBreakdownMinutes = this.numberValue('machineBreakdownMinutes');
    const toolBreakdownMinutes = this.numberValue('toolBreakdownMinutes');

    const totalBreakdownMinutes = idleMinutes + machineBreakdownMinutes + toolBreakdownMinutes;
    const totalDowntimeMinutes = lunchBreakMinutes + dinnerBreakMinutes + setupMinutes + totalBreakdownMinutes;

    const actualWorkingMinutes = Math.max(presenceMinutes - lunchBreakMinutes - dinnerBreakMinutes, 0);
    const runningMinutes = Math.max(presenceMinutes - totalDowntimeMinutes, 0);

    const okQty = this.entriesArray.controls.reduce(
      (sum, control) => sum + Number(control.getRawValue().okQuantity || 0),
      0
    );

    const rejectedQty = this.entriesArray.controls.reduce(
      (sum, control) => sum + Number(control.getRawValue().rejectedQuantity || 0),
      0
    );

    const totalProduction = okQty + rejectedQty;
    const expectedQuantity = this.perHourQuantity() * (runningMinutes / 60);

    const differenceQuantity = totalProduction - expectedQuantity;
    const shortageQuantity = Math.max(expectedQuantity - totalProduction, 0);
    const extraQuantity = Math.max(totalProduction - expectedQuantity, 0);

    const productionVariancePercent = expectedQuantity > 0
      ? totalProduction / expectedQuantity
      : 0;
    return {
      presenceHours: presenceMinutes / 60,
      actualWorkingHours: actualWorkingMinutes / 60,
      totalProduction,
      okQuantity: okQty,
      rejectedQuantity: rejectedQty,
      expectedQuantity,
      differenceQuantity,
      shortageQuantity,
      extraQuantity,
      achievementStatus: totalProduction >= expectedQuantity ? 'Achieved' : 'Shortage',
      rejectPercent: totalProduction > 0 ? (rejectedQty / totalProduction) * 100 : 0,
      efficiencyPercent: expectedQuantity > 0 ? (totalProduction / expectedQuantity) * 100 : 0,
      runningHours: runningMinutes / 60,
      lunchBreakMinutes,
      dinnerBreakMinutes,
      setupMinutes,
      idleMinutes,
      machineBreakdownMinutes,
      toolBreakdownMinutes,
      totalBreakdownMinutes,
      totalDowntimeMinutes,
      timeStatus: this.validateHeader(false) ? 'Valid' : 'Check Time',
      productionVariancePercent
    };
  }

  private validateHeader(showMessage: boolean): boolean {
    const inTime = this.toMinutes(this.form.controls.operatorInTime.value);
    const outTime = this.toMinutes(this.form.controls.operatorOutTime.value);

    if (inTime === null) {
      if (showMessage) this.toastService.warning('Operator In Time is required.', 'Time required');
      return false;
    }

    const isNightShift = this.form.controls.shiftName.value === 'Night Shift';

    if (outTime !== null && !isNightShift && outTime <= inTime) {
      if (showMessage) this.toastService.warning('Operator Out Time must be greater than In Time.', 'Invalid time');
      return false;
    }

    return this.validatePair('lunchOutTime', 'lunchInTime', 'Lunch', showMessage) &&
      this.validatePair('dinnerOutTime', 'dinnerInTime', 'Dinner', showMessage) &&
      this.validatePair('setupStartTime', 'setupEndTime', 'Setup', showMessage);
  }

  private validatePair(startName: string, endName: string, label: string, showMessage: boolean): boolean {
    const start = this.toMinutes(this.form.get(startName)?.value);
    const end = this.toMinutes(this.form.get(endName)?.value);

    if ((start !== null && end === null) || (start === null && end !== null)) {
      if (showMessage) this.toastService.warning(`${label} start and end both are required.`, 'Invalid time');
      return false;
    }

    if (start !== null && end !== null) {
      const duration = this.minutesBetween(startName, endName);

      if (duration <= 0 || duration > 12 * 60) {
        if (showMessage) this.toastService.warning(`${label} time is not valid.`, 'Invalid time');
        return false;
      }
    }

    return true;
  }

  private syncPerHourQuantity(): void {
    const value = this.perHourQuantity();
    if (this.form.controls.perHourQuantity.value !== value) {
      this.form.controls.perHourQuantity.setValue(value, { emitEvent: false });
    }
  }

  private perHourQuantity(): number {
    const totalCycle = this.numberValue('cycleTimeMinutes') + this.numberValue('loadUnloadTimeMinutes');
    const partsPerCycle = Math.max(this.numberValue('partsPerCycle'), 1);
    return totalCycle > 0 ? (60 / totalCycle) * partsPerCycle : 0;
  }

  private minutesBetween(startName: string, endName: string): number {
    const start = this.toMinutes(this.form.get(startName)?.value);
    const end = this.toMinutes(this.form.get(endName)?.value);

    if (start === null || end === null) return 0;

    let diff = end - start;

    if (diff <= 0) {
      diff += 24 * 60;
    }

    return diff;
  }

  private productionPresenceMinutes(): number {
    const inTime = this.toMinutes(this.form.controls.operatorInTime.value);
    if (inTime === null) return 0;

    const outTime = this.toMinutes(this.form.controls.operatorOutTime.value);

    if (outTime !== null) {
      let diff = outTime - inTime;

      if (diff <= 0) {
        diff += 24 * 60;
      }

      return diff;
    }

    if (this.reportStatus() === 'Completed') return 0;

    const reportDate = this.form.controls.reportDate.value;
    if (reportDate && reportDate !== this.today()) return 0;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let diff = currentMinutes - inTime;

    if (diff < 0 && this.form.controls.shiftName.value === 'Night Shift') {
      diff += 24 * 60;
    }

    return diff > 0 ? diff : 0;
  }

  private numberValue(name: string): number {
    const control = this.form.get(name);
    return Number(control?.value || 0);
  }

  private toMinutes(time: string | null | undefined): number | null {
    if (!time) return null;
    const parts = time.split(':').map(Number);
    return parts.length >= 2 ? parts[0] * 60 + parts[1] : null;
  }

  private addOneHour(time: string | null | undefined): string {
    const minutes = this.toMinutes(time);
    if (minutes === null) return '';
    const next = Math.min(minutes + 60, 23 * 60 + 59);
    return `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`;
  }

  private withSeconds(value: string | null | undefined): string | null {
    if (!value) return null;
    return value.length === 5 ? `${value}:00` : value;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  }

  private today(value?: string): string {
    return (value ? new Date(value) : new Date()).toISOString().slice(0, 10);
  }
}
