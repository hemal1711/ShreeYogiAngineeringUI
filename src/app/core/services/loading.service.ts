import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MasterService } from './master.service';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  
  private readonly destroyRef = inject(DestroyRef);
private readonly router = inject(Router);
  private readonly masterService = inject(MasterService);
  private readonly routeLoading = signal(false);

  readonly isLoading = computed(() => this.routeLoading() || this.masterService.isLoading());
  readonly message = computed(() => this.routeLoading() ? 'Loading page...' : 'Loading data...');

  constructor() {
    this.router.events
      .pipe(
        filter((event) =>
          event instanceof NavigationStart ||
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        )
      )
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.routeLoading.set(true);
          return;
        }

        this.routeLoading.set(false);
      });
  }
}
