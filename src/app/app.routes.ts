import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login'
  },
  {
    path: 'auth/login',
    data: { title: 'Login' },
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent:()=> import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        data: { title: 'Dashboard' },
        loadComponent: () => import('./auth/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'customers',
        canActivate: [permissionGuard],
        data: { permissions: ['customer.read'], title: 'Customers' },
        loadComponent: () => import('./features/customer/customer-list/customer-list.component').then(m => m.CustomerListComponent)
      },
      {
        path: 'customers/add',
        canActivate: [permissionGuard],
        data: { permissions: ['customer.create'], title: 'Add Customer' },
        loadComponent: () => import('./features/customer/customer-form/customer-form.component').then(m => m.CustomerFormComponent)
      },
      {
        path: 'customers/edit/:id',
        canActivate: [permissionGuard],
        data: { permissions: ['customer.update'], title: 'Edit Customer' },
        loadComponent: () => import('./features/customer/customer-form/customer-form.component').then(m => m.CustomerFormComponent)
      },
      {
        path: 'fasteners',
        canActivate: [permissionGuard],
        data: { permissions: ['fastener.read'], title: 'Fasteners' },
        loadComponent: () => import('./features/fastener/fastener-list/fastener-list.component').then(m => m.FastenerListComponent)
      },
      {
        path: 'fasteners/add',
        canActivate: [permissionGuard],
        data: { permissions: ['fastener.create'], title: 'Add Fastener' },
        loadComponent: () => import('./features/fastener/fastener-form/fastener-form.component').then(m => m.FastenerFormComponent)
      },
      {
        path: 'fasteners/edit/:id',
        canActivate: [permissionGuard],
        data: { permissions: ['fastener.update'], title: 'Edit Fastener' },
        loadComponent: () => import('./features/fastener/fastener-form/fastener-form.component').then(m => m.FastenerFormComponent)
      },
      {
        path: 'instruments',
        canActivate: [permissionGuard],
        data: { permissions: ['instrument.read'], title: 'Instruments' },
        loadComponent: () => import('./features/instrument/instrument-list/instrument-list.component').then(m => m.InstrumentListComponent)
      },
      {
        path: 'instruments/add',
        canActivate: [permissionGuard],
        data: { permissions: ['instrument.create'], title: 'Add Instrument' },
        loadComponent: () => import('./features/instrument/instrument-form/instrument-form.component').then(m => m.InstrumentFormComponent)
      },
      {
        path: 'instruments/edit/:id',
        canActivate: [permissionGuard],
        data: { permissions: ['instrument.update'], title: 'Edit Instrument' },
        loadComponent: () => import('./features/instrument/instrument-form/instrument-form.component').then(m => m.InstrumentFormComponent)
      },
      {
        path: 'instrument-issues',
        canActivate: [permissionGuard],
        data: { permissions: ['instrumentissue.read'], title: 'Instrument Issues' },
        loadComponent: () => import('./features/instrument-issue/instrument-issue-list/instrument-issue-list.component').then(m => m.InstrumentIssueListComponent)
      },
      {
        path: 'instrument-issues/add',
        canActivate: [permissionGuard],
        data: { permissions: ['instrumentissue.create'], title: 'Issue Instrument' },
        loadComponent: () => import('./features/instrument-issue/instrument-issue-form/instrument-issue-form.component').then(m => m.InstrumentIssueFormComponent)
      },
      {
        path: 'instrument-issues/edit/:id',
        canActivate: [permissionGuard],
        data: { permissions: ['instrumentissue.update'], title: 'Edit Instrument Issue' },
        loadComponent: () => import('./features/instrument-issue/instrument-issue-form/instrument-issue-form.component').then(m => m.InstrumentIssueFormComponent)
      },
      {
        path: 'manufacturing-items',
        canActivate: [permissionGuard],
        data: { permissions: ['manufacturingitem.read'], title: 'Manufacturing Items' },
        loadComponent: () => import('./features/manufacturing-item/manufacturing-item-list/manufacturing-item-list.component').then(m => m.ManufacturingItemListComponent)
      },
      {
        path: 'manufacturing-items/add',
        canActivate: [permissionGuard],
        data: { permissions: ['manufacturingitem.create'], title: 'Add Manufacturing Item' },
        loadComponent: () => import('./features/manufacturing-item/manufacturing-item-form/manufacturing-item-form.component').then(m => m.ManufacturingItemFormComponent)
      },
      {
        path: 'manufacturing-items/edit/:id',
        canActivate: [permissionGuard],
        data: { permissions: ['manufacturingitem.update'], title: 'Edit Manufacturing Item' },
        loadComponent: () => import('./features/manufacturing-item/manufacturing-item-form/manufacturing-item-form.component').then(m => m.ManufacturingItemFormComponent)
      },
      {
        path: 'manufacturing-operations',
        canActivate: [permissionGuard],
        data: { permissions: ['manufacturingoperation.read'], title: 'Manufacturing Operations' },
        loadComponent: () => import('./features/manufacturing-operation/manufacturing-operation-list/manufacturing-operation-list.component').then(m => m.ManufacturingOperationListComponent)
      },
      {
        path: 'manufacturing-operations/add',
        canActivate: [permissionGuard],
        data: { permissions: ['manufacturingoperation.create'], title: 'Add Manufacturing Operation' },
        loadComponent: () => import('./features/manufacturing-operation/manufacturing-operation-form/manufacturing-operation-form.component').then(m => m.ManufacturingOperationFormComponent)
      },
      {
        path: 'manufacturing-operations/edit/:id',
        canActivate: [permissionGuard],
        data: { permissions: ['manufacturingoperation.update'], title: 'Edit Manufacturing Operation' },
        loadComponent: () => import('./features/manufacturing-operation/manufacturing-operation-form/manufacturing-operation-form.component').then(m => m.ManufacturingOperationFormComponent)
      },
      {
        path: 'manufacturing-stock',
        canActivate: [permissionGuard],
        data: { permissions: ['manufacturingoperation.read'], title: 'Manufacturing Stock' },
        loadComponent: () => import('./features/stock-summary/manufacturing-stock-summary/manufacturing-stock-summary.component').then(m => m.ManufacturingStockSummaryComponent)
      },
      {
        path: 'tooling-items',
        canActivate: [permissionGuard],
        data: { permissions: ['toolingitem.read'], title: 'Tooling Items' },
        loadComponent: () => import('./features/tooling-item/tooling-item-list/tooling-item-list.component').then(m => m.ToolingItemListComponent)
      },
      {
        path: 'tooling-items/add',
        canActivate: [permissionGuard],
        data: { permissions: ['toolingitem.create'], title: 'Add Tooling Item' },
        loadComponent: () => import('./features/tooling-item/tooling-item-form/tooling-item-form.component').then(m => m.ToolingItemFormComponent)
      },
      {
        path: 'tooling-items/edit/:id',
        canActivate: [permissionGuard],
        data: { permissions: ['toolingitem.update'], title: 'Edit Tooling Item' },
        loadComponent: () => import('./features/tooling-item/tooling-item-form/tooling-item-form.component').then(m => m.ToolingItemFormComponent)
      },
      {
        path: 'tooling-operations',
        canActivate: [permissionGuard],
        data: { permissions: ['toolingoperation.read'], title: 'Tooling Operations' },
        loadComponent: () => import('./features/tooling-operation/tooling-operation-list/tooling-operation-list.component').then(m => m.ToolingOperationListComponent)
      },
      {
        path: 'tooling-operations/add',
        canActivate: [permissionGuard],
        data: { permissions: ['toolingoperation.create'], title: 'Add Tooling Operation' },
        loadComponent: () => import('./features/tooling-operation/tooling-operation-form/tooling-operation-form.component').then(m => m.ToolingOperationFormComponent)
      },
      {
        path: 'tooling-operations/edit/:id',
        canActivate: [permissionGuard],
        data: { permissions: ['toolingoperation.update'], title: 'Edit Tooling Operation' },
        loadComponent: () => import('./features/tooling-operation/tooling-operation-form/tooling-operation-form.component').then(m => m.ToolingOperationFormComponent)
      },
      {
        path: 'tooling-stock',
        canActivate: [permissionGuard],
        data: { permissions: ['toolingoperation.read'], title: 'Tooling Stock' },
        loadComponent: () => import('./features/stock-summary/tooling-stock-summary/tooling-stock-summary.component').then(m => m.ToolingStockSummaryComponent)
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { permissions: ['user.read'], title: 'Users' },
        loadComponent: () => import('./features/user/user-list/user-list.component').then(m => m.UserListComponent)
      },
      {
        path: 'users/add',
        canActivate: [permissionGuard],
        data: { permissions: ['user.create'], title: 'Add User' },
        loadComponent: () => import('./features/user/user-form/user-form.component').then(m => m.UserFormComponent)
      },
      {
        path: 'users/edit/:id',
        canActivate: [permissionGuard],
        data: { permissions: ['user.update'], title: 'Edit User' },
        loadComponent: () => import('./features/user/user-form/user-form.component').then(m => m.UserFormComponent)
      },
      {
        path: 'roles',
        canActivate: [permissionGuard],
        data: { permissions: ['role.read'], title: 'Roles' },
        loadComponent: () => import('./features/role/role-list/role-list.component').then(m => m.RoleListComponent)
      },
      {
        path: 'roles/add',
        canActivate: [permissionGuard],
        data: { permissions: ['role.create'], title: 'Add Role' },
        loadComponent: () => import('./features/role/role-form/role-form.component').then(m => m.RoleFormComponent)
      },
      {
        path: 'roles/edit/:id',
        canActivate: [permissionGuard],
        data: { permissions: ['role.update'], title: 'Edit Role' },
        loadComponent: () => import('./features/role/role-form/role-form.component').then(m => m.RoleFormComponent)
      },
      {
        path: 'role-permissions',
        canActivate: [permissionGuard],
        data: { permissions: ['rolepermission.read'], title: 'Role Permissions' },
        loadComponent: () => import('./features/role-permission/role-permission-list/role-permission-list.component').then(m => m.RolePermissionListComponent)
      },
      {
        path: 'permissions',
        canActivate: [permissionGuard],
        data: { permissions: ['permission.read'], title: 'Permissions' },
        loadComponent: () => import('./features/permission/permission-list/permission-list.component').then(m => m.PermissionListComponent)
      },
      {
        path: 'permissions/add',
        canActivate: [permissionGuard],
        data: { permissions: ['permission.create'], title: 'Add Permission' },
        loadComponent: () => import('./features/permission/permission-form/permission-form.component').then(m => m.PermissionFormComponent)
      },
      {
        path: 'permissions/edit/:id',
        canActivate: [permissionGuard],
        data: { permissions: ['permission.update'], title: 'Edit Permission' },
        loadComponent: () => import('./features/permission/permission-form/permission-form.component').then(m => m.PermissionFormComponent)
      },
      {
        path: 'user-roles',
        canActivate: [permissionGuard],
        data: { permissions: ['userrole.read'], title: 'User Roles' },
        loadComponent: () => import('./features/user-role/user-role-list/user-role-list.component').then(m => m.UserRoleListComponent)
      },
    ]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
