import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent {
  private router = inject(Router);
  authService = inject(AuthService);

  pageContent = viewChild<ElementRef<HTMLElement>>('pageContent');
  sidebarOpen = signal(true);

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.pageContent()?.nativeElement.scrollTo({ top: 0, behavior: 'instant' });
    });
  }

  // role() من AuthService يُرجع 'merchant' للـ seller و'admin' للأدمن مباشرة
  isMerchant = computed(() => this.authService.role() === 'merchant');
  isAdmin    = computed(() => this.authService.role() === 'admin');

  get activeRoute() {
    return this.router.url;
  }

  toggleSidebar() {
    this.sidebarOpen.update(open => !open);
  }

  async logout() {
    await this.authService.logout();
  }
}
