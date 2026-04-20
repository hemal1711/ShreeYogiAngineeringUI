import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, timeout } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class MasterService {
  private readonly requestTimeoutMs = 30000;
  private readonly pendingRequests = signal(0);
  private readonly http = inject(HttpClient);

  readonly isLoading = computed(() => this.pendingRequests() > 0);

  post<T>(url: string, body: unknown): Observable<ApiResponse<T>> {
    return this.withRequestTracking(
      this.http.post<ApiResponse<T>>(url, body)
    );
  }

  private withRequestTracking<T>(request$: Observable<ApiResponse<T>>): Observable<ApiResponse<T>> {
    this.pendingRequests.update((value) => value + 1);

    return request$.pipe(
      timeout(this.requestTimeoutMs),
      finalize(() => {
        this.pendingRequests.update((value) => (value > 0 ? value - 1 : 0));
      })
    );
  }
}
