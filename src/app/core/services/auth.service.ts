import { inject, Injectable, signal, computed } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import {
  AuthSession,
  CurrentUser,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest
} from '../models/auth.model';
import { ApiResponse } from '../models/api-response.model';
import { MasterService } from './master.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageKey = 'service-platform.auth';
  private readonly masterService = inject(MasterService);
  private readonly router = inject(Router);
  private readonly sessionState = signal<AuthSession | null>(this.readStoredSession());

  private refreshRequest$?: Observable<AuthSession>;

  readonly session = computed(() => this.sessionState());
  readonly currentUser = computed<CurrentUser | null>(() => this.sessionState()?.user ?? null);
  readonly permissions = computed<string[]>(() => this.currentUser()?.permissions ?? []);
  readonly isSystemRole = computed<boolean>(() => this.currentUser()?.isSystemRole ?? false);
  readonly isAuthenticated = computed(() => {
    const session = this.sessionState();
    return !!session?.accessToken && !this.isExpired(session.accessTokenExpiresAt);
  });
  readonly canRefresh = computed(() => {
    const session = this.sessionState();
    return !!session?.refreshToken && !this.isExpired(session.refreshTokenExpiresAt);
  });

  login(credentials: LoginRequest): Observable<AuthSession> {
    return this.masterService
      .post<LoginResponse>(API_ENDPOINTS.auth.login, credentials)
      .pipe(
        map((response) => this.unwrapData(response)),
        map((response) => this.createSession(response)),
        tap((session) => this.persistSession(session))
      );
  }

  refreshAccessToken(): Observable<AuthSession> {
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    const session = this.sessionState();
    if (!session?.refreshToken || !session?.accessToken) {
      return throwError(() => new Error('No session available for token refresh.'));
    }

    const request: RefreshTokenRequest = {
      refreshToken: session.refreshToken,
      accessToken: session.accessToken
    };

    this.refreshRequest$ = this.masterService
      .post<LoginResponse>(API_ENDPOINTS.auth.refreshToken, request)
      .pipe(
        map((response) => this.unwrapData(response)),
        map((response) => this.createSession(response)),
        tap((nextSession) => this.persistSession(nextSession)),
        catchError((error) => {
          this.clearSession();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshRequest$ = undefined;
        }),
        shareReplay(1)
      );

    return this.refreshRequest$;
  }

  logout(): Observable<void> {
    const hasSession = !!this.sessionState();

    if (!hasSession) {
      this.clearSession();
      return of(void 0);
    }

    return this.masterService.post<void>(API_ENDPOINTS.auth.logout, {}).pipe(
      map(() => void 0),
      catchError(() => of(void 0)),
      tap(() => this.clearSession())
    );
  }

  ensureValidSession(returnUrl: string): Observable<boolean | UrlTree> {
    if (this.isAuthenticated()) {
      return of(true);
    }

    if (!this.canRefresh()) {
      this.clearSession();
      return of(this.buildLoginRedirect(returnUrl));
    }

    return this.refreshAccessToken().pipe(
      map(() => true),
      catchError(() => of(this.buildLoginRedirect(returnUrl)))
    );
  }

  forceLogout(returnUrl = '/auth/login'): void {
    this.clearSession();
    void this.router.navigateByUrl(returnUrl);
  }

  getAccessToken(): string | null {
    const session = this.sessionState();
    if (!session || this.isExpired(session.accessTokenExpiresAt)) {
      return null;
    }

    return session.accessToken;
  }

  getCurrentUser(): CurrentUser | null {
    return this.currentUser();
  }

  hasPermission(permission: string): boolean {
    return this.isSystemRole() || this.permissions().includes(permission);
  }

  hasAnyPermission(permissions: readonly string[]): boolean {
    if (this.isSystemRole()) {
      return true;
    }

    if (permissions.length === 0) {
      return true;
    }

    const granted = this.permissions();
    return permissions.some((permission) => granted.includes(permission));
  }

  isAuthenticatedSync(): boolean {
    return this.isAuthenticated();
  }

  private buildLoginRedirect(returnUrl: string): UrlTree {
    return this.router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl }
    });
  }

  private persistSession(session: AuthSession): void {
    this.sessionState.set(session);
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  private clearSession(): void {
    this.sessionState.set(null);
    localStorage.removeItem(this.storageKey);
  }

  private readStoredSession(): AuthSession | null {
    const rawSession = localStorage.getItem(this.storageKey);
    if (!rawSession) {
      return null;
    }

    try {
      const session = JSON.parse(rawSession) as AuthSession;

      if (!session?.accessToken || !session?.refreshToken || !session.user) {
        localStorage.removeItem(this.storageKey);
        return null;
      }

      session.user.roles ??= [];
      session.user.permissions ??= [];
      session.user.userName ??= '';
      session.user.phoneNumber ??= '';
      session.user.isSystemRole = this.getIsSystemRoleFromToken(session.accessToken);

      if (this.isExpired(session.refreshTokenExpiresAt)) {
        localStorage.removeItem(this.storageKey);
        return null;
      }

      return session;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private createSession(response: LoginResponse): AuthSession {
    const isSystemRole = this.getIsSystemRoleFromToken(response.accessToken);

    return {
      user: {
        userCorrelationId: response.userCorrelationId,
        userName: response.userName,
        email: response.email,
        phoneNumber: response.phoneNumber,
        isSystemRole,
        fullName: response.fullName,
        roles: response.roles ?? [],
        permissions: response.permissions ?? [],
        tokenType: response.tokenType
      },
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      accessTokenExpiresAt: response.accessTokenExpiresAt,
      refreshTokenExpiresAt: response.refreshTokenExpiresAt,
      tokenType: response.tokenType
    };
  }

  private unwrapData<T>(response: ApiResponse<T>): T {
    if (response?.data !== undefined) {
      return response.data;
    }

    return response as T;
  }

  private isExpired(value: string): boolean {
    const timestamp = new Date(value).getTime();

    if (Number.isNaN(timestamp)) {
      return true;
    }

    return timestamp <= Date.now();
  }

  private getIsSystemRoleFromToken(accessToken: string): boolean {
    const claims = this.decodeToken(accessToken);
    const value = claims?.['IsSystemRole'] ?? claims?.['isSystemRole'] ?? claims?.['is_system_role'];
    return value === true || String(value).toLowerCase() === 'true';
  }

  private decodeToken(accessToken: string): Record<string, unknown> | null {
    const payload = accessToken.split('.')[1];
    if (!payload) {
      return null;
    }

    try {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
      return JSON.parse(atob(padded)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
