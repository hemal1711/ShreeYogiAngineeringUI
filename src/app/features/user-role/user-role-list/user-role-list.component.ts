import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PagedResponse, Role, User, UserRole } from '../../../core/models/access-control.model';
import { AccessControlService } from '../../../core/services/access-control.service';
import { PermissionService } from '../../../core/services/permission.service';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { ConfirmationDialogService } from '../../../shared/components/confirmation-dialog';
import { ToastService } from '../../../shared/components/toast';

@Component({
  selector: 'app-user-role-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BreadcrumbComponent],
  templateUrl: './user-role-list.component.html',
  styleUrl: './user-role-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserRoleListComponent {
  private readonly accessControlService = inject(AccessControlService);
  private readonly permissionService = inject(PermissionService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogService = inject(ConfirmationDialogService);
  private readonly toastService = inject(ToastService);

  readonly assignments = signal<UserRole[]>([]);
  readonly users = signal<User[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly removingId = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);

  readonly canCreate = this.permissionService.has('userrole.create');
  readonly canDelete = this.permissionService.has('userrole.delete');
  readonly canReadUsers = this.permissionService.has('user.read');
  readonly canReadRoles = this.permissionService.has('role.read');
  readonly canShowAssignForm = this.canCreate && this.canReadUsers && this.canReadRoles;

  form: FormGroup = this.formBuilder.group({
    userCorrelationId: ['', Validators.required],
    roleCorrelationId: ['', Validators.required]
  });

  constructor() {
    this.loadLookups();
    this.loadAssignments();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize());
  }

  get pageRange(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.pageNumber() - 2);
    const end = Math.min(this.totalPages, start + 4);
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
    return pages;
  }

  loadAssignments(): void {
    this.isLoading.set(true);
    this.accessControlService.getUserRoles(this.pageNumber(), this.pageSize()).subscribe({
      next: (response) => {
        const data = response.data as PagedResponse<UserRole> | undefined;
        const items = (data?.items ?? []).filter((assignment) => !this.isSuperAdminUser(assignment.userName));
        const totalCount = data?.totalCount ?? 0;
        if (items.length === 0 && this.pageNumber() > 1 && totalCount > 0) {
          this.pageNumber.set(1);
          this.loadAssignments();
          return;
        }
        this.assignments.set(items);
        this.totalCount.set(totalCount);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(error?.error?.message || 'We could not load user roles. Please try again.', 'User roles not loaded');
      }
    });
  }

  onAssign(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => control.markAsTouched());
      this.toastService.warning('Select a user and role before assigning.', 'Assignment needs attention');
      return;
    }

    this.isSubmitting.set(true);
    this.accessControlService.assignUserRole(this.form.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.form.reset({ userCorrelationId: '', roleCorrelationId: '' });
        this.toastService.success('Role assigned successfully.', 'User role saved');
        this.loadAssignments();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error?.error?.message || 'We could not assign this role. Please try again.', 'Assign failed');
      }
    });
  }

  onRemove(assignment: UserRole): void {
    this.dialogService.showDelete('user role').then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.removingId.set(assignment.correlationId);
      this.accessControlService.removeUserRole({
        userCorrelationId: assignment.userCorrelationId,
        roleCorrelationId: assignment.roleCorrelationId
      }).subscribe({
        next: () => {
          this.removingId.set(null);
          this.toastService.success('Role removed successfully.', 'User role removed');
          this.loadAssignments();
        },
        error: (error) => {
          this.removingId.set(null);
          this.toastService.error(error?.error?.message || 'We could not remove this user role. Please try again.', 'Remove failed');
        }
      });
    });
  }

  onPageChange(page: number): void {
    this.pageNumber.set(page);
    this.loadAssignments();
  }

  private loadLookups(): void {
    if (!this.canShowAssignForm) {
      return;
    }

    this.accessControlService.getUsers(1, 200).subscribe({
      next: (response) => this.users.set(((response.data as PagedResponse<User> | undefined)?.items ?? []).filter((user) => !this.isSuperAdminUser(user.userName)))
    });
    this.accessControlService.getRoles(1, 200).subscribe({
      next: (response) => this.roles.set(((response.data as PagedResponse<Role> | undefined)?.items ?? []).filter((role) => !role.isSystemRole))
    });
  }

  private isSuperAdminUser(userName: string): boolean {
    return userName.trim().toLowerCase() === 'superadmin';
  }
}
