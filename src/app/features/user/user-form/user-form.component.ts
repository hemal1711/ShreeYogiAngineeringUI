import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, of, switchMap } from 'rxjs';
import { PagedResponse, Role } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BreadcrumbComponent],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly accessControlService = inject(AccessControlService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);
  private readonly permissionService = inject(PermissionService);

  form!: FormGroup;
  readonly roles = signal<Role[]>([]);
  readonly selectedRoleIds = signal<Set<string>>(new Set());
  readonly originalRoleIds = signal<Set<string>>(new Set());
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly correlationId = signal<string | null>(null);
  readonly pageTitle = signal('Add User');
  readonly canManageRoles = this.permissionService.hasAny(['userrole.create', 'userrole.delete']);
  readonly canReadRoles = this.permissionService.has('role.read');
  readonly canReadUserRoles = this.permissionService.has('userrole.read');
  readonly canShowRolePicker = this.canManageRoles && this.canReadRoles && this.canReadUserRoles;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.correlationId.set(id);
    this.pageTitle.set(id ? 'Edit User' : 'Add User');

    this.form = this.formBuilder.group({
      userName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', id ? [] : [Validators.required, Validators.minLength(8)]],
      firstName: ['', Validators.maxLength(100)],
      lastName: ['', Validators.maxLength(100)],
      phoneNumber: [''],
      isActive: [true]
    });

    this.loadPage(id);
  }

  toggleRole(roleId: string): void {
    const next = new Set(this.selectedRoleIds());
    next.has(roleId) ? next.delete(roleId) : next.add(roleId);
    this.selectedRoleIds.set(next);
    this.form.markAsDirty();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => control.markAsTouched());
      this.toastService.warning('Please complete the required fields before saving.', 'User needs attention');
      return;
    }

    const id = this.correlationId();
    const value = this.form.value;
    const operation = id
      ? this.accessControlService.updateUser(id, {
          userName: value.userName,
          email: value.email,
          firstName: value.firstName || undefined,
          lastName: value.lastName || undefined,
          phoneNumber: value.phoneNumber || undefined,
          isActive: value.isActive
        })
      : this.accessControlService.createUser({
          userName: value.userName,
          email: value.email,
          password: value.password,
          firstName: value.firstName || undefined,
          lastName: value.lastName || undefined,
          phoneNumber: value.phoneNumber || undefined,
          isActive: value.isActive
        });
    this.isSubmitting.set(true);
    operation.pipe(
      switchMap((response) => {
        const userId = id || response.data?.correlationId;
        if (!userId || !this.canShowRolePicker) {
          return of(response);
        }
        return this.saveRoles(userId).pipe(switchMap(() => of(response)));
      })
    ).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success(id ? 'User updated successfully.' : 'User created successfully.', 'User saved');
        this.router.navigate(['/users']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error?.error?.message || 'We could not save this user. Please try again.', 'Save failed');
      }
    });
  }

  onCancel(): void {
    if (!this.form.dirty) {
      this.router.navigate(['/users']);
      return;
    }

    this.dialogService.showWarning('Unsaved Changes', 'You have unsaved changes to this user.', 'Do you want to discard these changes and leave?')
      .then((confirmed) => {
        if (confirmed) {
          this.router.navigate(['/users']);
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
      return `${this.labelFor(fieldName)} is required`;
    }
    if (field.errors['email']) {
      return 'Email must be valid';
    }
    if (field.errors['minlength']) {
      return `${this.labelFor(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }
    if (field.errors['maxlength']) {
      return `${this.labelFor(fieldName)} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
    }
    return 'Invalid value';
  }

  private loadPage(userId: string | null): void {
    this.isLoading.set(true);
    const roles$ = this.canShowRolePicker ? this.accessControlService.getRoles(1, 200) : of(null);
    const user$ = userId ? this.accessControlService.getUser(userId) : of(null);
    const userRoles$ = userId && this.canShowRolePicker ? this.accessControlService.getRolesForUser(userId) : of(null);

    forkJoin({ roles: roles$, user: user$, userRoles: userRoles$ }).subscribe({
      next: ({ roles, user, userRoles }) => {
        const roleItems = ((roles?.data as PagedResponse<Role> | undefined)?.items ?? []).filter((role) => !role.isSystemRole);
        this.roles.set(roleItems);

        if (user?.data) {
          if (this.isSuperAdminUser(user.data.userName)) {
            this.toastService.error('Superadmin user cannot be managed here.', 'User hidden');
            this.router.navigate(['/users']);
            return;
          }

          this.form.patchValue({
            userName: user.data.userName,
            email: user.data.email || '',
            firstName: user.data.firstName || '',
            lastName: user.data.lastName || '',
            phoneNumber: user.data.phoneNumber || '',
            isActive: user.data.isActive
          });
        }

        const assignableRoleIds = new Set(roleItems.map((role) => role.correlationId));
        const assignedIds = new Set<string>((userRoles?.data ?? [])
          .map((role) => role.roleCorrelationId)
          .filter((roleId) => assignableRoleIds.has(roleId)));
        this.selectedRoleIds.set(assignedIds);
        this.originalRoleIds.set(new Set(assignedIds));
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message || 'We could not load user data. Please try again.', 'User not loaded');
      }
    });
  }

  private saveRoles(userCorrelationId: string) {
    const original = this.originalRoleIds();
    const selected = this.selectedRoleIds();
    const added = Array.from(selected).filter((roleId) => !original.has(roleId));
    const removed = Array.from(original).filter((roleId) => !selected.has(roleId));
    const operations: Observable<unknown>[] = [
      ...added.map((roleCorrelationId) => this.accessControlService.assignUserRole({ userCorrelationId, roleCorrelationId })),
      ...removed.map((roleCorrelationId) => this.accessControlService.removeUserRole({ userCorrelationId, roleCorrelationId }))
    ];
    return operations.length > 0 ? forkJoin(operations) : of([]);
  }

  private labelFor(fieldName: string): string {
    const labels: Record<string, string> = {
      userName: 'Username',
      email: 'Email',
      password: 'Password',
      firstName: 'First name',
      lastName: 'Last name',
      phoneNumber: 'Phone number'
    };
    return labels[fieldName] ?? fieldName;
  }

  private isSuperAdminUser(userName: string): boolean {
    return userName.trim().toLowerCase() === 'superadmin';
  }
}
