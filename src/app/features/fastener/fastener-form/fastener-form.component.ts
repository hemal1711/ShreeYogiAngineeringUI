import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Fastener, FastenerRequest } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({ selector: 'app-fastener-form', standalone: true, imports: [CommonModule, ReactiveFormsModule, BreadcrumbComponent], templateUrl: './fastener-form.component.html', styleUrl: './fastener-form.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class FastenerFormComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AccessControlService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly correlationId = signal<string | null>(null);
  readonly pageTitle = signal('Add Fastener');
  readonly selectedPhoto = signal<File | null>(null);
  readonly selectedPhotoPreviewUrl = signal<string | null>(null);
  readonly currentPhotoUrl = signal<string | null>(null);
  form = this.fb.group({ itemCode: ['', [Validators.required, Validators.maxLength(100)]], itemName: ['', [Validators.required, Validators.maxLength(200)]], category: ['', Validators.maxLength(150)], size: ['', Validators.maxLength(100)], unit: ['PCS', Validators.maxLength(30)], currentStock: [0, [Validators.required, Validators.min(0)]], minimumStock: [0, [Validators.required, Validators.min(0)]], shopName: ['', Validators.maxLength(200)], location: ['', Validators.maxLength(200)], isActive: [true] });
  constructor() { const id = this.route.snapshot.paramMap.get('id'); if (id) { this.correlationId.set(id); this.pageTitle.set('Edit Fastener'); this.loadItem(id); } }
  onPhotoSelected(event: Event): void { const file = (event.target as HTMLInputElement).files?.[0] ?? null; this.selectedPhoto.set(file); this.selectedPhotoPreviewUrl.set(file ? URL.createObjectURL(file) : null); if (file) this.form.markAsDirty(); }
  removePhoto(input: HTMLInputElement): void { input.value = ''; this.selectedPhoto.set(null); this.selectedPhotoPreviewUrl.set(null); this.currentPhotoUrl.set(null); this.form.markAsDirty(); }
  onSubmit(): void { if (this.form.invalid) { Object.values(this.form.controls).forEach(c => c.markAsTouched()); this.toastService.warning('Please complete required fields.', 'Fastener needs attention'); return; } if (!this.hasPhoto()) { this.toastService.warning('Please upload a fastener photo before saving.', 'Photo required'); return; } const id = this.correlationId(); const value = this.form.getRawValue(); const request: FastenerRequest = { itemCode: value.itemCode ?? '', itemName: value.itemName ?? '', category: value.category ?? undefined, size: value.size ?? undefined, unit: value.unit ?? undefined, currentStock: value.currentStock ?? 0, minimumStock: value.minimumStock ?? 0, shopName: value.shopName ?? undefined, location: value.location ?? undefined, isActive: value.isActive ?? true, photoUrl: this.currentPhotoUrl() ?? undefined }; this.isSubmitting.set(true); const op = id ? this.service.updateFastener(id, request, this.selectedPhoto()) : this.service.createFastener(request, this.selectedPhoto()); op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.isSubmitting.set(false); this.toastService.success('Fastener saved successfully.', 'Fastener saved'); this.router.navigate(['/fasteners']); }, error: e => { this.isSubmitting.set(false); this.toastService.error(e?.error?.message || 'We could not save this fastener.', 'Save failed'); } }); }
  onCancel(): void { if (!this.form.dirty) { this.router.navigate(['/fasteners']); return; } this.dialogService.showWarning('Unsaved Changes', 'You have unsaved changes.', 'Discard these changes and leave?').then(c => { if (c) this.router.navigate(['/fasteners']); }); }
  isFieldInvalid(name: string): boolean { const f = this.form.get(name); return !!(f?.invalid && f.touched); }
  getFieldError(name: string): string | null { const f = this.form.get(name); if (!f?.errors || !f.touched) return null; if (f.errors['required']) return 'This field is required'; if (f.errors['min']) return 'Value must be zero or greater'; if (f.errors['maxlength']) return `Maximum ${f.errors['maxlength'].requiredLength} characters`; return 'Invalid value'; }
  getPhotoUrl(url: string | null): string { if (!url) return ''; if (/^https?:\/\//i.test(url)) return url; return `${environment.apiBaseUrl.replace(/\/api\/?$/, '')}${url}`; }
  private loadItem(id: string): void { this.isLoading.set(true); this.service.getFastener(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => { const item = r.data as Fastener | undefined; if (item) { this.form.patchValue(item); this.currentPhotoUrl.set(item.photoUrl ?? null); } this.isLoading.set(false); }, error: e => { this.isLoading.set(false); this.toastService.error(e?.error?.message || 'We could not load this fastener.', 'Fastener not loaded'); } }); }
  private hasPhoto(): boolean { return !!this.selectedPhoto() || !!this.currentPhotoUrl(); }
}
