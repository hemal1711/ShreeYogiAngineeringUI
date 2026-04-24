import { DestroyRef, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, of, switchMap } from 'rxjs';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PagedResponse, Permission } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

type PermissionAction = 'create' | 'read' | 'update' | 'delete';

interface PermissionMatrixRow {
  module: string;
  moduleLabel: string;
  actions: Partial<Record<PermissionAction, Permission>>;
  otherActions: Permission[];
}

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BreadcrumbComponent],
  templateUrl: './role-form.component.html',
  styleUrl: './role-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleFormComponent {
  
  private readonly destroyRef = inject(DestroyRef);
private readonly formBuilder = inject(FormBuilder);
  private readonly accessControlService = inject(AccessControlService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);
  private readonly permissionService = inject(PermissionService);

  form!: FormGroup;
  readonly permissions = signal<Permission[]>([]);
  readonly selectedPermissionIds = signal<Set<string>>(new Set());
  readonly originalPermissionIds = signal<Set<string>>(new Set());
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly correlationId = signal<string | null>(null);
  readonly pageTitle = signal('Add Role');
  readonly canManagePermissions = this.permissionService.has('rolepermission.manage');
  readonly canReadPermissions = this.permissionService.has('permission.read');
  readonly canReadRolePermissions = this.permissionService.has('rolepermission.read');
  readonly canShowPermissionPicker = this.canReadPermissions && this.canReadRolePermissions && this.canManagePermissions;
  readonly permissionActions: PermissionAction[] = ['create', 'read', 'update', 'delete'];
  readonly permissionMatrix = computed<PermissionMatrixRow[]>(() => this.buildPermissionMatrix(this.permissions()));

  constructor() {
    this.form = this.formBuilder.group({
      roleName: ['', [Validators.required, Validators.maxLength(100)]],
      isActive: [true]
    });

    const id = this.route.snapshot.paramMap.get('id');
    this.correlationId.set(id);
    this.pageTitle.set(id ? 'Edit Role' : 'Add Role');
    this.loadPage(id);
  }

  togglePermission(permissionId: string): void {
    const next = new Set(this.selectedPermissionIds());
    if (next.has(permissionId)) {
      next.delete(permissionId);
    } else {
      next.add(permissionId);
    }
    this.selectedPermissionIds.set(next);
    this.form.markAsDirty();
  }

  getActionPermission(row: PermissionMatrixRow, action: PermissionAction): Permission | undefined {
    return row.actions[action];
  }

  getPermissionActionLabel(action: PermissionAction): string {
    return action.charAt(0).toUpperCase() + action.slice(1);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => control.markAsTouched());
      this.toastService.warning('Please complete the required fields before saving.', 'Role needs attention');
      return;
    }

    const request = {
      roleName: this.form.value.roleName,
      isActive: this.form.value.isActive
    };
    const id = this.correlationId();
    const operation = id ? this.accessControlService.updateRole(id, request) : this.accessControlService.createRole(request);

    this.isSubmitting.set(true);
    operation.pipe(
      switchMap((response) => {
        const roleId = id || response.data?.correlationId;
        if (!roleId || !this.canShowPermissionPicker) {
          return of(response);
        }
        return this.savePermissions(roleId).pipe(switchMap(() => of(response)));
      })
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success(id ? 'Role updated successfully.' : 'Role created successfully.', 'Role saved');
        this.router.navigate(['/roles']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error?.error?.message || 'We could not save this role. Please try again.', 'Save failed');
      }
    });
  }

  onCancel(): void {
    if (!this.form.dirty) {
      this.router.navigate(['/roles']);
      return;
    }

    this.dialogService.showWarning('Unsaved Changes', 'You have unsaved changes to this role.', 'Do you want to discard these changes and leave?')
      .then((confirmed) => {
        if (confirmed) {
          this.router.navigate(['/roles']);
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
      return `${fieldName === 'roleName' ? 'Role name' : fieldName} is required`;
    }
    if (field.errors['maxlength']) {
      return `Role name cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
    }
    return 'Invalid value';
  }

  private loadPage(roleId: string | null): void {
    this.isLoading.set(true);
    const permissions$ = this.canShowPermissionPicker ? this.accessControlService.getPermissions(1, 200) : of(null);
    const role$ = roleId ? this.accessControlService.getRole(roleId) : of(null);
    const assigned$ = roleId && this.canShowPermissionPicker ? this.accessControlService.getRolePermissionIds(roleId) : of(null);

    forkJoin({ permissions: permissions$, role: role$, assigned: assigned$ }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ permissions, role, assigned }) => {
        const permissionItems = (permissions?.data as PagedResponse<Permission> | undefined)?.items ?? [];
        this.permissions.set(permissionItems);

        if (role?.data) {
          if (role.data.isSystemRole) {
            this.toastService.error('System roles cannot be managed here.', 'Role hidden');
            this.router.navigate(['/roles']);
            return;
          }
          this.form.patchValue({
            roleName: role.data.roleName,
            isActive: role.data.isActive
          });
        }

        const assignedIds = new Set<string>(assigned?.data ?? []);
        this.selectedPermissionIds.set(assignedIds);
        this.originalPermissionIds.set(new Set(assignedIds));
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message || 'We could not load role data. Please try again.', 'Role not loaded');
      }
    });
  }

  private savePermissions(roleCorrelationId: string) {
    const original = this.originalPermissionIds();
    const selected = this.selectedPermissionIds();
    const added = Array.from(selected).filter((permissionId) => !original.has(permissionId));
    const removed = Array.from(original).filter((permissionId) => !selected.has(permissionId));
    const operations: Observable<ApiResponse<boolean>>[] = [];

    if (added.length > 0) {
      operations.push(this.accessControlService.assignRolePermissions({ roleCorrelationId, permissionCorrelationIds: added }));
    }

    removed.forEach((permissionId) => operations.push(this.accessControlService.removeRolePermission(roleCorrelationId, permissionId)));

    return operations.length > 0 ? forkJoin(operations) : of([]);
  }

  private buildPermissionMatrix(permissions: Permission[]): PermissionMatrixRow[] {
    const rows = new Map<string, PermissionMatrixRow>();

    [...permissions]
      .sort((first, second) => first.code.localeCompare(second.code))
      .forEach((permission) => {
        const [modulePart, actionPart = ''] = permission.code.split('.');
        const module = modulePart || permission.code;
        const action = actionPart.toLowerCase() as PermissionAction;

        if (!rows.has(module)) {
          rows.set(module, {
            module,
            moduleLabel: this.formatModuleName(module),
            actions: {},
            otherActions: []
          });
        }

        const row = rows.get(module)!;
        if (this.permissionActions.includes(action)) {
          row.actions[action] = permission;
        } else {
          row.otherActions.push(permission);
        }
      });

    return Array.from(rows.values());
  }

  private formatModuleName(module: string): string {
    return module
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
