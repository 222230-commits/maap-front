import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

export const SUPER_ADMIN_EMAIL = 'hs350vae@gmail.com';

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

  // حالة النافذة المنبثقة لترقية الحساب وإشعار حذف المتجر
  showPromotedWelcome = signal(false);
  mustDeleteShop = signal(false);
  promotedShopName = signal('');

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.pageContent()?.nativeElement.scrollTo({ top: 0, behavior: 'instant' });
    });

    // مراقبة بيانات المستخدم وإظهار إشعار الترقية وحذف المتجر عند الدخول
    effect(() => {
      const user = this.authService.currentUser();
      if (!user) return;

      const isCurrentAdmin = this.authService.role() === 'admin' || user.role === 'admin';
      const isSuper = user.email?.toLowerCase()?.trim() === SUPER_ADMIN_EMAIL;

      // تظهر النافذة للمدراء الجدد فقط (دون المؤسس الأول) إذا لم يتم تأكيد الإشعار من قبل
      if (isCurrentAdmin && !isSuper) {
        const welcomeSeen = localStorage.getItem(`has_seen_admin_welcome_${user.id}`);
        const mustDelete = localStorage.getItem(`admin_must_delete_shop_${user.id}`) === 'true';
        const shopName = localStorage.getItem(`admin_shop_name_${user.id}`) || '';

        if (!welcomeSeen || mustDelete) {
          this.mustDeleteShop.set(mustDelete);
          this.promotedShopName.set(shopName);
          this.showPromotedWelcome.set(true);
        }
      }
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

  dismissPromotedWelcome() {
    const user = this.authService.currentUser();
    if (user) {
      localStorage.setItem(`has_seen_admin_welcome_${user.id}`, 'true');
      localStorage.removeItem(`admin_must_delete_shop_${user.id}`);
    }
    this.showPromotedWelcome.set(false);
  }

  async logout() {
    await this.authService.logout();
  }
}

