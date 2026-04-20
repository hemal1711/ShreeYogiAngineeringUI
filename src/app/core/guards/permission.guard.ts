import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

export const permissionGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const permissionService = inject(PermissionService);
  const permissions = route.data?.['permissions'] as string[] | undefined;

  if (!permissions?.length || permissionService.hasAny(permissions)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
