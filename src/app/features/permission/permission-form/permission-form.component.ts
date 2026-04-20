import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccessControlService } from '../../../core/services/access-control.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-permission-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BreadcrumbComponent],
  templateUrl: './permission-form.component.html',
  styleUrl: './permission-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly accessControlService = inject(AccessControlService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);

  form!: FormGroup;
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly correlationId = signal<string | null>(null);
  readonly pageTitle = signal('Add Permission');

  constructor() {
    this.form = this.formBuilder.group({
      code: ['', [Validators.required, Validators.maxLength(150)]],
      name: ['', [Validators.required, Validators.maxLength(150)]],
      description: ['', Validators.maxLength(500)],
      isActive: [true]
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.correlationId.set(id);
      this.pageTitle.set('Edit Permission');
      this.loadPermission(id);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => control.markAsTouched());
      this.toastService.warning('Please complete the required fields before saving.', 'Permission needs attention');
      return;
    }

    const request = {
      code: this.form.value.code,
      name: this.form.value.name,
      description: this.form.value.description || undefined,
      isActive: this.form.value.isActive
    };
    const id = this.correlationId();
    const operation = id ? this.accessControlService.updatePermission(id, request) : this.accessControlService.createPermission(request);

    this.isSubmitting.set(true);
    operation.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success(id ? 'Permission updated successfully.' : 'Permission created successfully.', 'Permission saved');
        this.router.navigate(['/permissions']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error?.error?.message || 'We could not save this permission. Please try again.', 'Save failed');
      }
    });
  }

  onCancel(): void {
    if (!this.form.dirty) {
      this.router.navigate(['/permissions']);
      return;
    }

    this.dialogService.showWarning('Unsaved Changes', 'You have unsaved changes to this permission.', 'Do you want to discard these changes and leave?')
      .then((confirmed) => {
        if (confirmed) {
          this.router.navigate(['/permissions']);
        }
      });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.invalid && field.touched);
  }

  getFieldError(fieldName: string): string | null {
    const field = this.form.get(fieldName);
    if (!field?.errors || !field.touched) {
      return null;
    }
    if (field.errors['required']) {
      return `${this.formatFieldName(fieldName)} is required`;
    }
    if (field.errors['maxlength']) {
      return `${this.formatFieldName(fieldName)} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
    }
    return 'Invalid value';
  }

  private loadPermission(correlationId: string): void {
    this.isLoading.set(true);
    this.accessControlService.getPermission(correlationId).subscribe({
      next: (response) => {
        const permission = response.data;
        if (permission) {
          this.form.patchValue({
            code: permission.code,
            name: permission.name,
            description: permission.description || '',
            isActive: permission.isActive
          });
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message || 'We could not load this permission. Please try again.', 'Permission not loaded');
      }
    });
  }

  private formatFieldName(name: string): string {
    return name.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
  }
}
