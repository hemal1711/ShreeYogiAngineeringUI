import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PageTitleService {
  private readonly appTitle = 'Shree Yogi Engineering';
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private initialized = false;

  init(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.setTitleFromRoute();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.setTitleFromRoute());
  }

  private setTitleFromRoute(): void {
    const routeTitle = this.findRouteTitle(this.router.routerState.snapshot.root);
    this.title.setTitle(routeTitle ? `${routeTitle} | ${this.appTitle}` : this.appTitle);
  }

  private findRouteTitle(route: ActivatedRouteSnapshot): string | null {
    let current: ActivatedRouteSnapshot | null = route;
    let routeTitle: string | null = null;

    while (current) {
      const title = current.data['title'];

      if (typeof title === 'string' && title.trim().length > 0) {
        routeTitle = title.trim();
      }

      current = current.firstChild ?? null;
    }

    return routeTitle;
  }
}
