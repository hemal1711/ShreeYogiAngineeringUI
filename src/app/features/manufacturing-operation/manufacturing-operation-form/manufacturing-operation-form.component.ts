import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ManufacturingItem, ManufacturingOperation, PagedResponse } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PhotoOptimizerService } from '../../../core/services/photo-optimizer.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-manufacturing-operation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BreadcrumbComponent],
  templateUrl: './manufacturing-operation-form.component.html',
  styleUrl: './manufacturing-operation-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManufacturingOperationFormComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AccessControlService);
  private readonly photoOptimizer = inject(PhotoOptimizerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);

  readonly items = signal<ManufacturingItem[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly correlationId = signal<string | null>(null);
  readonly pageTitle = signal('Add Manufacturing Operation');
  readonly selectedPhoto = signal<File | null>(null);
  readonly selectedPhotoPreviewUrl = signal<string | null>(null);
  readonly currentPhotoUrl = signal<string | null>(null);
  readonly types = ['Received', 'Dispatched'];

  form: FormGroup = this.fb.group({
    manufacturingItemCorrelationId: ['', Validators.required],
    operationType: ['Received', Validators.required],
    quantity: [null, [Validators.required, Validators.min(0.01)]],
    operationDate: [this.today(), Validators.required],
    challanNo: ['', Validators.maxLength(100)],
    lotNo: ['', Validators.maxLength(100)],
    isItemRejected: [false],
    rejectedReason: [''],
    rejectedQuantity: [null],
    remarks: ['', Validators.maxLength(1000)]
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.correlationId.set(id);
      this.pageTitle.set('Edit Manufacturing Operation');
    }

    this.form.controls['operationType'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncRejectedValidators());

    this.form.controls['isItemRejected'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncRejectedValidators());

    this.loadPage(id);
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.setSelectedPhoto(null);
      return;
    }
    this.setSelectedPhoto(await this.photoOptimizer.optimize(file));
    this.form.markAsDirty();
  }

  removePhoto(input: HTMLInputElement): void {
    input.value = '';
    this.setSelectedPhoto(null);
    this.currentPhotoUrl.set(null);
    this.form.markAsDirty();
  }

  onSubmit(): void {
    this.syncRejectedValidators();
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(c => c.markAsTouched());
      this.toastService.warning('Please complete required fields.', 'Operation needs attention');
      return;
    }
    if (!this.hasPhoto()) {
      this.toastService.warning('Please upload an operation photo before saving.', 'Photo required');
      return;
    }

    const raw = this.form.value;
    const request = {
      ...raw,
      isItemRejected: raw.operationType === 'Dispatched' && !!raw.isItemRejected,
      rejectedReason: raw.operationType === 'Dispatched' && raw.isItemRejected ? raw.rejectedReason : undefined,
      rejectedQuantity: raw.operationType === 'Dispatched' && raw.isItemRejected ? raw.rejectedQuantity : 0,
      photoUrl: this.currentPhotoUrl() ?? undefined
    };
    const id = this.correlationId();
    this.isSubmitting.set(true);
    const op = id ? this.service.updateManufacturingOperation(id, request, this.selectedPhoto()) : this.service.createManufacturingOperation(request, this.selectedPhoto());
    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success('Operation saved successfully.', 'Operation saved');
        this.router.navigate(['/manufacturing-operations']);
      },
      error: e => {
        this.isSubmitting.set(false);
        this.toastService.error(e?.error?.message || 'We could not save this operation.', 'Save failed');
      }
    });
  }

  onCancel(): void {
    if (!this.form.dirty) {
      this.router.navigate(['/manufacturing-operations']);
      return;
    }
    this.dialogService.showWarning('Unsaved Changes', 'You have unsaved changes.', 'Discard these changes and leave?').then(c => {
      if (c) this.router.navigate(['/manufacturing-operations']);
    });
  }

  isFieldInvalid(name: string): boolean {
    const field = this.form.get(name);
    return !!(field?.invalid && field.touched);
  }

  showRejectedSection(): boolean {
    return this.form.controls['operationType'].value === 'Dispatched';
  }

  getPhotoUrl(photoUrl: string | null): string {
    if (!photoUrl) return '';
    if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
    return `${environment.apiBaseUrl.replace(/\/api\/?$/, '')}${photoUrl}`;
  }

  private loadPage(id: string | null): void {
    this.isLoading.set(true);
    this.service.getManufacturingItems(1, 500).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        this.items.set((r.data as PagedResponse<ManufacturingItem> | undefined)?.items ?? []);
        if (id) this.loadOperation(id);
        else {
          this.syncRejectedValidators();
          this.isLoading.set(false);
        }
      },
      error: e => {
        this.isLoading.set(false);
        this.toastService.error(e?.error?.message || 'We could not load items.', 'Items not loaded');
      }
    });
  }

  private loadOperation(id: string): void {
    this.service.getManufacturingOperation(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        const op = r.data as ManufacturingOperation | undefined;
        if (op) {
          this.form.patchValue({
            ...op,
            operationType: op.operationType === 'Rejected' ? 'Dispatched' : op.operationType,
            isItemRejected: op.operationType === 'Rejected' || !!op.isItemRejected,
            rejectedReason: op.rejectedReason ?? (op.operationType === 'Rejected' ? op.remarks ?? '' : ''),
            rejectedQuantity: op.rejectedQuantity || (op.operationType === 'Rejected' ? op.quantity : null),
            operationDate: this.today(op.operationDate),
            manufacturingItemCorrelationId: op.manufacturingItemCorrelationId
          });
          this.currentPhotoUrl.set(op.photoUrl ?? null);
        }
        this.syncRejectedValidators();
        this.isLoading.set(false);
      },
      error: e => {
        this.isLoading.set(false);
        this.toastService.error(e?.error?.message || 'We could not load this operation.', 'Operation not loaded');
      }
    });
  }

  private syncRejectedValidators(): void {
    const isDispatch = this.form.controls['operationType'].value === 'Dispatched';
    const isRejected = !!this.form.controls['isItemRejected'].value;
    const reason = this.form.controls['rejectedReason'];
    const quantity = this.form.controls['rejectedQuantity'];

    if (isDispatch && isRejected) {
      reason.setValidators([Validators.required, Validators.maxLength(500)]);
      quantity.setValidators([Validators.required, Validators.min(0.01), Validators.max(Number(this.form.controls['quantity'].value || 0))]);
    } else {
      reason.clearValidators();
      quantity.clearValidators();
      if (!isDispatch) this.form.controls['isItemRejected'].setValue(false, { emitEvent: false });
      reason.setValue('', { emitEvent: false });
      quantity.setValue(null, { emitEvent: false });
    }

    reason.updateValueAndValidity({ emitEvent: false });
    quantity.updateValueAndValidity({ emitEvent: false });
  }

  private today(value?: string): string {
    return (value ? new Date(value) : new Date()).toISOString().slice(0, 10);
  }

  private hasPhoto(): boolean {
    return !!this.selectedPhoto() || !!this.currentPhotoUrl();
  }

  private setSelectedPhoto(file: File | null): void {
    const previewUrl = this.selectedPhotoPreviewUrl();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    this.selectedPhoto.set(file);
    this.selectedPhotoPreviewUrl.set(file ? URL.createObjectURL(file) : null);
  }
}
