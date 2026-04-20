import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Breadcrumb {
  label: string;
  link: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BreadcrumbComponent {
  private readonly router = inject(Router);
  breadcrumbs = signal<Breadcrumb[]>([]);

  constructor() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.buildBreadcrumbs())
      )
      .subscribe(breadcrumbs => {
        this.breadcrumbs.set(breadcrumbs);
      });

    // Initial setup
    this.breadcrumbs.set(this.buildBreadcrumbs());
  }

  private buildBreadcrumbs(): Breadcrumb[] {
    const url = this.router.url.split('/').filter(i => i.length > 0);
    const breadcrumbs: Breadcrumb[] = [{ label: 'Dashboard', link: '/dashboard' }];

    url.forEach((item, index) => {
      if (item === 'dashboard') return;

      const link = `/${url.slice(0, index + 1).join('/')}`;
      const label = this.formatLabel(item);

      breadcrumbs.push({ label, link });
    });

    return breadcrumbs;
  }

  private formatLabel(text: string): string {
    return text
      .replace(/-/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .split(' ')
      .reduce((acc, word, i) => {
        if (i === 0) return word;
        return acc + ' ' + word;
      }, '');
  }
}
