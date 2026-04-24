import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Customer, PagedResponse, ToolingItem } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-tooling-item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BreadcrumbComponent],
  templateUrl: './tooling-item-form.component.html',
  styleUrl: './tooling-item-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolingItemFormComponent {
  
  private readonly destroyRef = inject(DestroyRef);
private readonly fb = inject(FormBuilder);
  private readonly service = inject(AccessControlService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);
  readonly customers = signal<Customer[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly correlationId = signal<string | null>(null);
  readonly pageTitle = signal('Add Tooling Item');
  readonly selectedPhoto = signal<File | null>(null);
  readonly selectedPhotoPreviewUrl = signal<string | null>(null);
  readonly currentPhotoUrl = signal<string | null>(null);
  form: FormGroup = this.fb.group({
    itemCode: ['', [Validators.required, Validators.maxLength(100)]],
    itemName: ['', [Validators.required, Validators.maxLength(200)]],
    customerCorrelationId: ['', Validators.required],
    unit: ['PCS', Validators.maxLength(30)],
    location: ['', Validators.maxLength(200)],
    description: ['', Validators.maxLength(1000)],
    lowStockThreshold: [0, [Validators.required, Validators.min(0)]],
    isActive: [true]
  });
  constructor() { const id = this.route.snapshot.paramMap.get('id'); if (id) { this.correlationId.set(id); this.pageTitle.set('Edit Tooling Item'); } this.loadPage(id); }
  onSubmit(): void {
    if (this.form.invalid) { Object.values(this.form.controls).forEach((c) => c.markAsTouched()); this.toastService.warning('Please complete required fields.', 'Item needs attention'); return; }
    const id = this.correlationId(); this.isSubmitting.set(true);
    const request = { ...this.form.value, photoUrl: this.currentPhotoUrl() ?? undefined };
    const op = id ? this.service.updateToolingItem(id, request, this.selectedPhoto()) : this.service.createToolingItem(request, this.selectedPhoto());
    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.isSubmitting.set(false); this.toastService.success('Tooling item saved successfully.', 'Item saved'); this.router.navigate(['/tooling-items']); }, error: (error) => { this.isSubmitting.set(false); this.toastService.error(error?.error?.message || 'We could not save this item.', 'Save failed'); } });
  }
  onCancel(): void { if (!this.form.dirty) { this.router.navigate(['/tooling-items']); return; } this.dialogService.showWarning('Unsaved Changes', 'You have unsaved changes to this item.', 'Discard these changes and leave?').then((confirmed) => { if (confirmed) this.router.navigate(['/tooling-items']); }); }
  isFieldInvalid(name: string): boolean { const f = this.form.get(name); return !!(f?.invalid && f.touched); }
  getFieldError(name: string): string | null { const f = this.form.get(name); if (!f?.errors || !f.touched) return null; if (f.errors['required']) return 'This field is required'; if (f.errors['min']) return 'Value must be zero or greater'; if (f.errors['maxlength']) return `Maximum ${f.errors['maxlength'].requiredLength} characters`; return 'Invalid value'; }
  onPhotoSelected(event: Event): void { const input = event.target as HTMLInputElement; const file = input.files?.[0] ?? null; this.selectedPhoto.set(file); this.selectedPhotoPreviewUrl.set(file ? URL.createObjectURL(file) : null); if (file) this.form.markAsDirty(); }
  getPhotoUrl(photoUrl: string | null): string { if (!photoUrl) return ''; if (/^https?:\/\//i.test(photoUrl)) return photoUrl; return `${environment.apiBaseUrl.replace(/\/api\/?$/, '')}${photoUrl}`; }
  private loadPage(id: string | null): void { this.isLoading.set(true); this.service.getCustomers(1, 200).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (r) => { this.customers.set((r.data as PagedResponse<Customer> | undefined)?.items ?? []); if (id) this.loadItem(id); else this.isLoading.set(false); }, error: (error) => { this.isLoading.set(false); this.toastService.error(error?.error?.message || 'We could not load customers.', 'Customers not loaded'); } }); }
  private loadItem(id: string): void { this.service.getToolingItem(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (r) => { const item = r.data as ToolingItem | undefined; if (item) { this.form.patchValue(item); this.currentPhotoUrl.set(item.photoUrl ?? null); } this.isLoading.set(false); }, error: (error) => { this.isLoading.set(false); this.toastService.error(error?.error?.message || 'We could not load this item.', 'Item not loaded'); } }); }
}
