import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import {
  Customer,
  MachineName,
  MachineType,
  ManufacturingItem,
  PagedResponse,
  ProductionReport,
  ProductionReportEntry,
  ProductionReportSetupTime,
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
  productionVariancePercent: number;
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
  readonly filteredItems = signal<ManufacturingItem[]>([]);
  readonly customers = signal<Customer[]>([]);
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
  private pendingAutoAddSlot: { fromTime: string; toTime: string } | null = null;
  readonly canCreateReport = this.permissionService.has('productionreport.create');
  readonly canUpdateReport = this.permissionService.has('productionreport.update');
  readonly canReopenMissedEntries = this.permissionService.has('productionreport.missed.reopen');
  readonly canReadUsers = this.permissionService.has('user.read');
  readonly canReadManufacturingItems = this.permissionService.has('manufacturingitem.read');

  readonly shifts = ['Day Shift', 'Night Shift'];
  readonly rejectReasons = ['Size Issue', 'Surface Issue', 'Tool Break', 'Machine Vibration', 'Other'];
  readonly idleReasons = ['Tool Change', 'Power Cut', 'Machine Breakdown', 'Material Not Available', 'Setting Time'];

  readonly form = this.fb.group({
    customerCorrelationId: [''],
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
    setupTimes: this.fb.array([]),
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

    this.form.controls.customerCorrelationId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((customerId) => {
      this.onCustomerChange(customerId);
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const autoAdd = params.get('autoAddSlot');
      const slotFrom = params.get('slotFrom');
      const slotTo = params.get('slotTo');

      if (autoAdd === 'true' && slotFrom && slotTo) {
        this.pendingAutoAddSlot = {
          fromTime: this.normalizeTimeInput(slotFrom) ?? slotFrom,
          toTime: this.normalizeTimeInput(slotTo) ?? slotTo
        };
      } else {
        this.pendingAutoAddSlot = null;
      }
    });

    this.loadPage(id);
  }

  get entriesArray(): FormArray<FormGroup> {
    return this.form.get('entries') as FormArray<FormGroup>;
  }

  get setupTimesArray(): FormArray<FormGroup> {
    return this.form.get('setupTimes') as FormArray<FormGroup>;
  }

  addSetupTime(): void {
    const last = this.setupTimesArray.at(this.setupTimesArray.length - 1)?.getRawValue();
    this.setupTimesArray.push(this.createSetupTimeGroup({
      setupStartTime: last?.setupEndTime || '',
      setupEndTime: ''
    }));
    this.form.markAsDirty();
    this.refreshUi();
  }

  removeSetupTime(index: number): void {
    this.setupTimesArray.removeAt(index);
    this.form.markAsDirty();
    this.refreshUi();
  }

  addManualEntry(): void {
    const last = this.entriesArray.at(this.entriesArray.length - 1)?.getRawValue();
    const fromTime = last?.toTime || this.form.controls.operatorInTime.value || '';
    const toTime = this.addOneHour(fromTime);

    this.addEntrySlot(fromTime, toTime);
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

    if (this.hasUnsavedHeaderChanges()) {
      this.toastService.warning('Save the report header before saving hourly entries.', 'Save report first');
      return;
    }

    if (group.invalid) {
      group.markAllAsTouched();
      this.toastService.warning('Complete the hourly entry before saving.', 'Entry needs attention');
      return;
    }

    const beforeSaveValue = group.getRawValue();
    if (!this.isSlotInsideVisibleOperatorTime(beforeSaveValue.fromTime, beforeSaveValue.toTime)) {
      this.toastService.warning('Hourly slot must be inside operator in/out time.', 'Invalid slot');
      return;
    }

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
    if (this.isBreakEntry(index)) {
      this.toastService.warning('Break slots are managed by lunch and dinner actions.', 'Break slot locked');
      return;
    }

    if (this.isMissedEntry(index) && !this.canReopenMissedEntries) {
      this.toastService.warning('Only admin can reopen missed entries.', 'Admin required');
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
          this.loadReport(reportId);
        }
      });
  }

  saveTimeAction(controlName: 'operatorInTime' | 'lunchOutTime' | 'lunchInTime' | 'dinnerOutTime' | 'dinnerInTime'): void {
    if (this.form.get(controlName)?.value) {
      this.toastService.warning('This time is already recorded. Admin can correct it if needed.', 'Already recorded');
      return;
    }

    this.form.get(controlName)?.setValue(this.currentTime());
    this.form.get(controlName)?.markAsDirty();
    this.onSubmit();
  }

  checkOutNow(): void {
    if (this.form.controls.operatorOutTime.value) {
      this.completeReport();
      return;
    }

    this.form.controls.operatorOutTime.setValue(this.currentTime());
    this.form.controls.operatorOutTime.markAsDirty();
    this.completeReport();
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
    if (this.isLunchEntry(index)) return 'Lunch';
    if (this.isDinnerEntry(index)) return 'Dinner';
    if (String(value.entryStatus ?? '').toLowerCase() === 'missed') return 'Missed';
    if (this.isEntryLocked(index)) return 'Locked';
    return value.correlationId ? 'Unlocked' : 'Pending';
  }

  statusClass(status: string | null | undefined): string {
    const value = (status || 'Open').toLowerCase();
    if (value === 'completed' || value === 'unlocked') return 'badge-success';
    if (value === 'cancelled' || value === 'missed') return 'badge-danger';
    if (value === 'lunch' || value === 'dinner') return 'badge-warning';
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

  canEditCoreHeader(): boolean {
    return this.canManageHeader || (!this.hasStartedEntries() && this.canEditHeader());
  }

  private addEntrySlot(fromTime: string | null | undefined, toTime: string | null | undefined): boolean {
    const normalizedFromTime = this.normalizeTimeInput(fromTime);
    const normalizedToTime = this.normalizeTimeInput(toTime);

    if (!normalizedFromTime || !normalizedToTime) {
      this.toastService.warning('Please provide a valid hourly slot range.', 'Invalid slot');
      return false;
    }

    if (!this.isSlotInsideVisibleOperatorTime(normalizedFromTime, normalizedToTime)) {
      this.toastService.warning('This hourly slot is outside the operator in/out time. Save correct operator time first.', 'Invalid slot');
      return false;
    }

    const exists = this.entriesArray.controls.some((control) => {
      const value = control.getRawValue();
      return this.normalizeTimeInput(value.fromTime) === normalizedFromTime && this.normalizeTimeInput(value.toTime) === normalizedToTime;
    });

    if (exists) {
      this.toastService.info('This hourly slot already exists.', 'Slot already added');
      return false;
    }

    this.entriesArray.push(this.createEntryGroup({ fromTime: normalizedFromTime, toTime: normalizedToTime, okQuantity: 0, rejectedQuantity: 0 }));
    this.form.markAsDirty();
    this.formVersion.update((value) => value + 1);
    return true;
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
      entryStatus: [entry?.entryStatus ?? (locked ? 'Locked' : entry?.correlationId ? 'Submitted' : 'Pending')],
      submittedAt: [entry?.submittedAt ?? null],
      lockedAt: [entry?.lockedAt ?? null]
    });
    this.applyEntryControlState(group, locked);
    return group;
  }

  private loadPage(id: string | null): void {
    this.isLoading.set(true);
    forkJoin({
      items: this.canReadManufacturingItems ? this.service.getManufacturingItems(1, 500) : this.service.getProductionReportItemLookups(),
      customers: this.canReadManufacturingItems ? this.service.getCustomers(1, 500) : this.service.getCustomersLookup(),
      machineTypes: this.service.getMachineTypes(),
      machineNames: this.service.getMachineNames(),
      users: this.canReadUsers ? this.service.getUsers(1, 500) : of(null)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ items, customers, machineTypes, machineNames, users }) => {
          const manufacturingItems = this.resolveItems(items?.data);
          const customerOptions = this.resolveCustomers(customers?.data);
          this.items.set(manufacturingItems);
          this.filteredItems.set(manufacturingItems);
          this.customers.set(customerOptions);
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
    const selectedCustomerId = report.customerCorrelationId || '';
    const filteredItems = this.items().filter((item) => !selectedCustomerId || item.customerCorrelationId === selectedCustomerId);
    this.filteredItems.set(filteredItems);
    this.form.patchValue({
      customerCorrelationId: selectedCustomerId,
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

    this.entriesArray.clear();
    this.setupTimesArray.clear();
    this.resolveSetupTimes(report).forEach((setup) => this.setupTimesArray.push(this.createSetupTimeGroup(setup)));
    report.entries.forEach((entry) => this.entriesArray.push(this.createEntryGroup(this.normalizeEntry(entry))));
    this.applyPendingAutoAddSlot();
    this.applyHeaderControlState();
    this.syncPerHourQuantity();
    this.form.markAsPristine();
    this.refreshUi();
  }

  private applyPendingAutoAddSlot(): void {
    if (!this.pendingAutoAddSlot || !this.correlationId()) {
      return;
    }

    const { fromTime, toTime } = this.pendingAutoAddSlot;
    const didAdd = this.addEntrySlot(fromTime, toTime);
    if (didAdd) {
      this.pendingAutoAddSlot = null;
      this.toastService.info('The missed slot has been added for you. Review it and save when ready.', 'Slot added');
    }
  }

  private onCustomerChange(customerId: string | null | undefined): void {
    const selectedCustomerId = customerId || '';
    const filteredItems = this.items().filter((item) => !selectedCustomerId || item.customerCorrelationId === selectedCustomerId);
    this.filteredItems.set(filteredItems);

    if (!selectedCustomerId) {
      this.form.controls.manufacturingItemCorrelationId.setValue('', { emitEvent: false });
      return;
    }

    const currentSelection = this.form.controls.manufacturingItemCorrelationId.value;
    const stillValid = filteredItems.some((item) => item.correlationId === currentSelection);
    if (!stillValid) {
      this.form.controls.manufacturingItemCorrelationId.setValue('', { emitEvent: false });
    }
  }

  private buildHeaderRequest(): ProductionReportRequest {
    const raw = this.form.getRawValue();
    const setupTimes = raw.setupTimes as Array<{ correlationId?: string | null; setupStartTime?: string; setupEndTime?: string; remarks?: string }>;
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
      setupStartTime: this.withSeconds(setupTimes[0]?.setupStartTime),
      setupEndTime: this.withSeconds(setupTimes[0]?.setupEndTime),
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
      setupTimes: setupTimes.map((setup) => ({
        correlationId: setup.correlationId ?? undefined,
        setupStartTime: this.withSeconds(setup.setupStartTime) || '00:00:00',
        setupEndTime: this.withSeconds(setup.setupEndTime) || '00:00:00',
        remarks: setup.remarks?.trim() || undefined
      })),
      entries: []
    };
  }

  private createSetupTimeGroup(setup?: Partial<ProductionReportSetupTime>): FormGroup {
    return this.fb.group({
      correlationId: [setup?.correlationId ?? null],
      setupStartTime: [setup?.setupStartTime?.slice(0, 5) ?? '', Validators.required],
      setupEndTime: [setup?.setupEndTime?.slice(0, 5) ?? '', Validators.required],
      remarks: [setup?.remarks ?? '', Validators.maxLength(500)]
    });
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
    const value = group.getRawValue();
    return this.reportStatus() === 'Completed' || !!value.lockedAt || this.isBreakEntryValue(value.entryStatus);
  }

  private isLockedEntry(entry?: Partial<ProductionReportEntry>): boolean {
    return this.reportStatus() === 'Completed' || !!entry?.lockedAt || this.isBreakEntryValue(entry?.entryStatus);
  }

  private isMissedEntry(index: number): boolean {
    return String(this.entriesArray.at(index)?.getRawValue()?.entryStatus ?? '').toLowerCase() === 'missed';
  }

  private isLunchEntry(index: number): boolean {
    return String(this.entriesArray.at(index)?.getRawValue()?.entryStatus ?? '').toLowerCase() === 'lunch';
  }

  private isDinnerEntry(index: number): boolean {
    return String(this.entriesArray.at(index)?.getRawValue()?.entryStatus ?? '').toLowerCase() === 'dinner';
  }

  private isBreakEntry(index: number): boolean {
    return this.isBreakEntryValue(this.entriesArray.at(index)?.getRawValue()?.entryStatus);
  }

  private isBreakEntryValue(status: string | null | undefined): boolean {
    const value = String(status ?? '').toLowerCase();
    return value === 'lunch' || value === 'dinner';
  }

  private hasUnsavedHeaderChanges(): boolean {
    return [
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
      'setupTimes',
      'cycleTimeMinutes',
      'loadUnloadTimeMinutes',
      'partsPerCycle',
      'idleMinutes',
      'idleReason',
      'machineBreakdownMinutes',
      'toolBreakdownMinutes',
      'remarks'
    ].some((name) => this.form.get(name)?.dirty);
  }

  private normalizeTimeInput(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (twentyFourHourMatch) {
      return `${twentyFourHourMatch[1].padStart(2, '0')}:${twentyFourHourMatch[2]}`;
    }

    const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!twelveHourMatch) return null;

    let hours = Number(twelveHourMatch[1]);
    const minutes = twelveHourMatch[2];
    const meridiem = twelveHourMatch[3].toUpperCase();

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  private isSlotInsideVisibleOperatorTime(fromTime: string | null | undefined, toTime: string | null | undefined): boolean {
    const operatorIn = this.toMinutes(this.form.controls.operatorInTime.value);
    const operatorOut = this.toMinutes(this.form.controls.operatorOutTime.value);
    const from = this.toMinutes(fromTime);
    const to = this.toMinutes(toTime);

    if (operatorIn === null || from === null || to === null) return false;
    if (operatorOut === null) return this.offsetMinutes(operatorIn, from) >= 0;

    const fromOffset = this.offsetMinutes(operatorIn, from);
    let toOffset = this.offsetMinutes(operatorIn, to);
    if (toOffset <= fromOffset) toOffset += 24 * 60;

    const outOffset = this.offsetMinutes(operatorIn, operatorOut);
    return fromOffset >= 0 && toOffset <= outOffset;
  }

  private applyHeaderControlState(): void {
    const coreHeaderControls = [
      'manufacturingItemCorrelationId',
      'machineType',
      'machineName',
      'shiftName',
      'reportDate',
      'operatorUserCorrelationId'
    ];

    const editableHeaderControls = [
      'jobName',
      'cycleTimeMinutes',
      'loadUnloadTimeMinutes',
      'partsPerCycle',
      'idleMinutes',
      'idleReason',
      'machineBreakdownMinutes',
      'toolBreakdownMinutes',
      'remarks'
    ];

    const actionTimeControls = [
      'operatorInTime',
      'operatorOutTime',
      'lunchOutTime',
      'lunchInTime',
      'dinnerOutTime',
      'dinnerInTime'
    ];

    coreHeaderControls.forEach((name) => {
      const control = this.form.get(name);
      if (!control) return;
      this.canEditCoreHeader()
        ? control.enable({ emitEvent: false })
        : control.disable({ emitEvent: false });
    });

    editableHeaderControls.forEach((name) => {
      const control = this.form.get(name);
      if (!control) return;
      this.canEditHeader()
        ? control.enable({ emitEvent: false })
        : control.disable({ emitEvent: false });
    });

    actionTimeControls.forEach((name) => {
      const control = this.form.get(name);
      if (!control) return;

      const canEditActionTime = this.canManageHeader || (this.canEditHeader() && !control.value);
      canEditActionTime
        ? control.enable({ emitEvent: false })
        : control.disable({ emitEvent: false });
    });

    this.form.controls.perHourQuantity.disable({ emitEvent: false });
  }

  private hasStartedEntries(): boolean {
    return this.entriesArray.controls.some((control) => !!control.getRawValue().correlationId);
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
          openingStock: 0,
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

  private resolveCustomers(data: unknown): Customer[] {
    if (!data) return [];
    if (Array.isArray(data)) return data as Customer[];
    return (data as PagedResponse<Customer>).items ?? [];
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
    const setupMinutes = this.setupTimesArray.controls.reduce((sum, control) => {
      const value = control.getRawValue();
      return sum + this.minutesBetweenValues(value.setupStartTime, value.setupEndTime);
    }, 0);

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

    return this.validateBreakPair('lunchOutTime', 'lunchInTime', 'Lunch', showMessage) &&
      this.validateBreakPair('dinnerOutTime', 'dinnerInTime', 'Dinner', showMessage) &&
      this.validateSetupTimes(showMessage);
  }

  private validateSetupTimes(showMessage: boolean): boolean {
    const ranges = this.setupTimesArray.controls.map((control) => control.getRawValue());

    for (let index = 0; index < ranges.length; index++) {
      const setup = ranges[index];
      const start = this.toMinutes(setup.setupStartTime);
      const end = this.toMinutes(setup.setupEndTime);

      if (start === null || end === null) {
        if (showMessage) this.toastService.warning(`Setup ${index + 1} in and out time are required.`, 'Invalid setup time');
        return false;
      }

      const duration = this.minutesBetweenValues(setup.setupStartTime, setup.setupEndTime);
      if (duration <= 0 || duration > 12 * 60) {
        if (showMessage) this.toastService.warning(`Setup ${index + 1} time is not valid.`, 'Invalid setup time');
        return false;
      }

      if (!this.isSlotInsideVisibleOperatorTime(setup.setupStartTime, setup.setupEndTime)) {
        if (showMessage) this.toastService.warning(`Setup ${index + 1} must be inside operator in/out time.`, 'Invalid setup time');
        return false;
      }

      for (let otherIndex = index + 1; otherIndex < ranges.length; otherIndex++) {
        if (this.isOverlappingRange(setup.setupStartTime, setup.setupEndTime, ranges[otherIndex].setupStartTime, ranges[otherIndex].setupEndTime)) {
          if (showMessage) this.toastService.warning('Setup times cannot overlap.', 'Invalid setup time');
          return false;
        }
      }
    }

    return true;
  }

  private validateBreakPair(startName: string, endName: string, label: string, showMessage: boolean): boolean {
    const start = this.toMinutes(this.form.get(startName)?.value);
    const end = this.toMinutes(this.form.get(endName)?.value);

    if (start === null && end !== null) {
      if (showMessage) this.toastService.warning(`${label} Out is required before ${label} In.`, 'Invalid time');
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

  private validateClosedPair(startName: string, endName: string, label: string, showMessage: boolean): boolean {
    const start = this.toMinutes(this.form.get(startName)?.value);
    const end = this.toMinutes(this.form.get(endName)?.value);

    if ((start !== null && end === null) || (start === null && end !== null)) {
      if (showMessage) this.toastService.warning(`${label} start and end both are required.`, 'Invalid time');
      return false;
    }

    return this.validateBreakPair(startName, endName, label, showMessage);
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

  private minutesBetweenValues(startTime: string | null | undefined, endTime: string | null | undefined): number {
    const start = this.toMinutes(startTime);
    const end = this.toMinutes(endTime);

    if (start === null || end === null) return 0;

    let diff = end - start;
    if (diff <= 0) diff += 24 * 60;
    return diff;
  }

  private isOverlappingRange(startA: string, endA: string, startB: string, endB: string): boolean {
    const aStart = this.toMinutes(startA);
    const aEnd = this.toMinutes(endA);
    const bStart = this.toMinutes(startB);
    const bEnd = this.toMinutes(endB);

    if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false;

    return this.expandRange(aStart, aEnd).some((a) =>
      this.expandRange(bStart, bEnd).some((b) => a.start < b.end && a.end > b.start)
    );
  }

  private expandRange(start: number, end: number): { start: number; end: number }[] {
    return end > start
      ? [{ start, end }]
      : [{ start, end: 24 * 60 }, { start: 0, end }];
  }

  private resolveSetupTimes(report: ProductionReport): ProductionReportSetupTime[] {
    if (report.setupTimes?.length) {
      return report.setupTimes;
    }

    return report.setupStartTime && report.setupEndTime
      ? [{ setupStartTime: report.setupStartTime, setupEndTime: report.setupEndTime }]
      : [];
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

  private offsetMinutes(origin: number, value: number): number {
    const diff = value - origin;
    return diff >= 0 ? diff : diff + 24 * 60;
  }

  private addOneHour(time: string | null | undefined): string {
    const minutes = this.toMinutes(time);
    if (minutes === null) return '';
    const next = (minutes + 60) % (24 * 60);
    return `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`;
  }

  private currentTime(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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
