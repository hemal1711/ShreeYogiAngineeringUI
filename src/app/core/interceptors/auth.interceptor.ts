import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../constants/api-endpoints';

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
 ) => {
  const authService = inject(AuthService);
  const apiRequest = addApiBaseUrl(request);

  if (isAuthEndpoint(apiRequest.url)) {
    return next(apiRequest);
  }

  const accessToken = authService.getAccessToken();
  const authorizedRequest = accessToken ? addToken(apiRequest, accessToken) : apiRequest;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !authService.canRefresh()) {
        return throwError(() => error);
      }

      return authService.refreshAccessToken().pipe(
        switchMap((session) => next(addToken(apiRequest, session.accessToken))),
        catchError((refreshError) => {
          authService.forceLogout('/auth/login');
          return throwError(() => refreshError);
        })
      );
    })
  );
};

function addApiBaseUrl(request: HttpRequest<unknown>): HttpRequest<unknown> {
  if (!request.url.startsWith('/')) {
    return request;
  }

  const baseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  return request.clone({ url: `${baseUrl}${request.url}` });
}

function addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes(API_ENDPOINTS.auth.login) ||
    url.includes(API_ENDPOINTS.auth.refreshToken)
  );
}
