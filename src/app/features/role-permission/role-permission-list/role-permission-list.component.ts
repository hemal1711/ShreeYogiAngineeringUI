import { DestroyRef, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PagedResponse, Permission, Role } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-role-permission-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './role-permission-list.component.html',
  styleUrl: './role-permission-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RolePermissionListComponent {
  
  private readonly destroyRef = inject(DestroyRef);
private readonly accessControlService = inject(AccessControlService);
  private readonly permissionService = inject(PermissionService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);

  readonly roles = signal<Role[]>([]);
  readonly permissions = signal<Permission[]>([]);
  readonly assignedPermissionIds = signal<Set<string>>(new Set());
  readonly selectedRoleId = signal<string>('');
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly removingId = signal<string | null>(null);
  readonly appliedSearchTerm = signal('');
  searchTerm = '';

  readonly canManage = this.permissionService.has('rolepermission.manage');
  readonly canReadRoles = this.permissionService.has('role.read');
  readonly canReadPermissions = this.permissionService.has('permission.read');
  readonly canUpdatePermission = this.permissionService.has('permission.update');
  readonly canShowAssignForm = this.canManage && this.canReadRoles && this.canReadPermissions;

  readonly assignedPermissions = computed(() => {
    const assignedIds = this.assignedPermissionIds();
    return this.permissions()
      .filter((permission) => assignedIds.has(permission.correlationId))
      .sort((first, second) => first.code.localeCompare(second.code));
  });

  readonly filteredAssignedPermissions = computed(() => {
    const term = this.appliedSearchTerm().trim().toLowerCase();
    const permissions = this.assignedPermissions();

    if (!term) {
      return permissions;
    }

    return permissions.filter((permission) =>
      permission.code.toLowerCase().includes(term) ||
      permission.name.toLowerCase().includes(term) ||
      (permission.description ?? '').toLowerCase().includes(term)
    );
  });

  readonly availablePermissions = computed(() => {
    const assignedIds = this.assignedPermissionIds();
    return this.permissions()
      .filter((permission) => !assignedIds.has(permission.correlationId))
      .sort((first, second) => first.code.localeCompare(second.code));
  });

  form: FormGroup = this.formBuilder.group({
    roleCorrelationId: ['', Validators.required],
    permissionCorrelationId: ['', Validators.required]
  });

  constructor() {
    this.form.get('roleCorrelationId')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((roleId: string) => {
      this.selectedRoleId.set(roleId || '');
      this.form.patchValue({ permissionCorrelationId: '' }, { emitEvent: false });
      this.loadRolePermissions(roleId);
    });

    this.loadLookups();
  }

  onAssign(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => control.markAsTouched());
      this.toastService.warning('Select a role and permission before assigning.', 'Assignment needs attention');
      return;
    }

    const roleCorrelationId = this.form.value.roleCorrelationId as string;
    const permissionCorrelationId = this.form.value.permissionCorrelationId as string;

    this.isSubmitting.set(true);
    this.accessControlService.assignRolePermissions({
      roleCorrelationId,
      permissionCorrelationIds: [permissionCorrelationId]
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.form.patchValue({ permissionCorrelationId: '' });
        this.toastService.success('Permission assigned successfully.', 'Role permission saved');
        this.loadRolePermissions(roleCorrelationId);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error?.error?.message || 'We could not assign this permission. Please try again.', 'Assign failed');
      }
    });
  }

  onSearch(): void {
    this.appliedSearchTerm.set(this.searchTerm);
  }
  exportCsv(): void {
    this.downloadCsv('role-permissions.csv', [['Permission Code','Name','Description','Status'], ...this.filteredAssignedPermissions().map(x => [x.code, x.name, x.description || '', x.isActive ? 'Active' : 'Inactive'])]);
  }

  onRemove(permission: Permission): void {
    const roleCorrelationId = this.selectedRoleId();
    if (!roleCorrelationId) {
      return;
    }

    this.dialogService.showDelete('role permission').then((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.removingId.set(permission.correlationId);
      this.accessControlService.removeRolePermission(roleCorrelationId, permission.correlationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.removingId.set(null);
          this.toastService.success('Permission removed from role.', 'Role permission removed');
          this.loadRolePermissions(roleCorrelationId);
        },
        error: (error) => {
          this.removingId.set(null);
          this.toastService.error(error?.error?.message || 'We could not remove this permission. Please try again.', 'Remove failed');
        }
      });
    });
  }

  get selectedRoleName(): string {
    const roleId = this.selectedRoleId();
    return this.roles().find((role) => role.correlationId === roleId)?.roleName || 'selected role';
  }

  getStatusBadge(isActive: boolean): { class: string; text: string } {
    return isActive ? { class: 'badge-success', text: 'Active' } : { class: 'badge-danger', text: 'Inactive' };
  }

  private loadLookups(): void {
    if (!this.canReadRoles || !this.canReadPermissions) {
      return;
    }

    this.isLoading.set(true);
    forkJoin({
      roles: this.accessControlService.getRoles(1, 200),
      permissions: this.accessControlService.getPermissions(1, 500)
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ roles, permissions }) => {
        const roleItems = ((roles.data as PagedResponse<Role> | undefined)?.items ?? []).filter((role) => !role.isSystemRole);
        const permissionItems = (permissions.data as PagedResponse<Permission> | undefined)?.items ?? [];
        this.roles.set(roleItems);
        this.permissions.set(permissionItems);

        const firstRoleId = roleItems[0]?.correlationId ?? '';
        this.form.patchValue({ roleCorrelationId: firstRoleId }, { emitEvent: false });
        this.selectedRoleId.set(firstRoleId);
        this.loadRolePermissions(firstRoleId);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message || 'We could not load roles and permissions. Please try again.', 'Role permissions not loaded');
      }
    });
  }

  private loadRolePermissions(roleCorrelationId: string): void {
    if (!roleCorrelationId || !this.canReadRoles || !this.canReadPermissions) {
      this.assignedPermissionIds.set(new Set());
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.accessControlService.getRolePermissionIds(roleCorrelationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.assignedPermissionIds.set(new Set(response.data ?? []));
        this.isLoading.set(false);
      },
      error: (error) => {
        this.assignedPermissionIds.set(new Set());
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message || 'We could not load assignments for this role. Please try again.', 'Assignments not loaded');
      }
    });
  }
  private downloadCsv(fileName: string, rows: string[][]): void { const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); }
}
