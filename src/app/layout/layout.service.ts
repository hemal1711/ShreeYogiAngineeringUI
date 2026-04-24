import { Injectable, computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  readonly sidebarCollapsed = signal(this.readInitialSidebarState());
  readonly mobileSidebarOpen = signal(false);
  readonly isSidebarVisible = computed(() => !this.sidebarCollapsed() || this.mobileSidebarOpen());

  toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => {
      const next = !value;
      localStorage.setItem('shell-sidebar-collapsed', String(next));
      return next;
    });
  }

  openMobileSidebar(): void {
    this.mobileSidebarOpen.set(true);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((value) => !value);
  }

  private readInitialSidebarState(): boolean {
    return localStorage.getItem('shell-sidebar-collapsed') === 'true';
  }
}
