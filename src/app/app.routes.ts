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
        path: 'bookings',
        canActivate: [permissionGuard],
        data: {
          permissions: ['booking.read'],
          title: 'Bookings',
          subtitle: 'Track booking flow, confirmation status, and upcoming assigned jobs from a single workspace.',
          statLabel: 'Live bookings',
          statValue: '31'
        },
        loadComponent: () => import('./shared/feature-page/feature-page.component').then(m => m.FeaturePageComponent),
      },
      {
        path: 'services',
        canActivate: [permissionGuard],
        data: {
          permissions: ['service.read'],
          title: 'Services',
          subtitle: 'Control service listings, pricing strategy, and availability within your workspace.',
          statLabel: 'Published services',
          statValue: '42'
        },
        loadComponent: () => import('./shared/feature-page/feature-page.component').then(m => m.FeaturePageComponent),
      },
      {
        path: 'services/add',
        canActivate: [permissionGuard],
        data: {
          permissions: ['service.create'],
          title: 'Add Service',
          subtitle: 'Create a new service entry and prepare it for pricing and publication.',
          statLabel: 'Required inputs',
          statValue: '10'
        },
        loadComponent: () => import('./shared/feature-page/feature-page.component').then(m => m.FeaturePageComponent),
      },
      {
        path: 'job-requests',
        canActivate: [permissionGuard],
        data: {
          permissions: ['jobrequest.read'],
          title: 'Job Request List',
          subtitle: 'Review incoming custom-job requests and keep assignment and quote workflows organized.',
          statLabel: 'Pending requests',
          statValue: '6'
        },
        loadComponent: () => import('./shared/feature-page/feature-page.component').then(m => m.FeaturePageComponent),
      },
      {
        path: 'job-services',
        canActivate: [permissionGuard],
        data: {
          permissions: ['jobservice.read'],
          title: 'Job Service List',
          subtitle: 'Track service line items related to custom jobs and fulfillment progress.',
          statLabel: 'Service items',
          statValue: '14'
        },
        loadComponent: () => import('./shared/feature-page/feature-page.component').then(m => m.FeaturePageComponent),
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
      {
        path: 'settings',
        canActivate: [permissionGuard],
        data: { permissions: ['settings.read'], title: 'Settings' },
        loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
