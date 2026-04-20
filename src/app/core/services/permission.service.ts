import { computed, inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private readonly authService = inject(AuthService);

  readonly permissions = computed(() => this.authService.permissions());

  has(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  hasAny(permissions: readonly string[]): boolean {
    return this.authService.hasAnyPermission(permissions);
  }
}
