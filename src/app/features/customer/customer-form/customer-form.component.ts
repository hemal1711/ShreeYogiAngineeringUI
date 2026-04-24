import { CommonModule } from '@angular/common';
import { DestroyRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccessControlService } from '../../../core/services/access-control.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BreadcrumbComponent],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerFormComponent {
  
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
  readonly pageTitle = signal('Add Customer');

  form: FormGroup = this.fb.group({
    customerName: ['', [Validators.required, Validators.maxLength(150)]],
    code: ['', [Validators.required, Validators.maxLength(50)]],
    contactPerson: ['', Validators.maxLength(150)],
    phone: ['', Validators.maxLength(20)],
    email: ['', [Validators.email, Validators.maxLength(200)]],
    address: ['', Validators.maxLength(500)],
    isActive: [true]
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.correlationId.set(id);
      this.pageTitle.set('Edit Customer');
      this.loadCustomer(id);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => control.markAsTouched());
      this.toastService.warning('Please complete the required fields.', 'Customer needs attention');
      return;
    }
    const id = this.correlationId();
    const request = this.form.value;
    this.isSubmitting.set(true);
    const operation = id ? this.service.updateCustomer(id, request) : this.service.createCustomer(request);
    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success(id ? 'Customer updated successfully.' : 'Customer created successfully.', 'Customer saved');
        this.router.navigate(['/customers']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error?.error?.message || 'We could not save this customer.', 'Save failed');
      }
    });
  }

  onCancel(): void {
    if (!this.form.dirty) {
      this.router.navigate(['/customers']);
      return;
    }
    this.dialogService.showWarning('Unsaved Changes', 'You have unsaved changes to this customer.', 'Discard these changes and leave?')
      .then((confirmed) => { if (confirmed) this.router.navigate(['/customers']); });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.invalid && field.touched);
  }

  getFieldError(fieldName: string): string | null {
    const field = this.form.get(fieldName);
    if (!field?.errors || !field.touched) return null;
    if (field.errors['required']) return `${this.formatFieldName(fieldName)} is required`;
    if (field.errors['email']) return 'Enter a valid email address';
    if (field.errors['maxlength']) return `${this.formatFieldName(fieldName)} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
    return 'Invalid value';
  }

  private loadCustomer(id: string): void {
    this.isLoading.set(true);
    this.service.getCustomer(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.data) this.form.patchValue(response.data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message || 'We could not load this customer.', 'Customer not loaded');
      }
    });
  }

  private formatFieldName(name: string): string {
    return name.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
  }
}
