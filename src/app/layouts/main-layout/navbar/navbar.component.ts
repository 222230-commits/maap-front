import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AiService } from '../../../core/services/ai.service';
import { BuyerService } from '../../../core/services/buyer.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  host: {
    '(window:scroll)': 'onScroll()'
  }
})
export class NavbarComponent {
  themeService  = inject(ThemeService);
  authService   = inject(AuthService);
  cartService   = inject(CartService);
  notifService  = inject(NotificationService);
  private aiService    = inject(AiService);
  private buyerService = inject(BuyerService);
  private router = inject(Router);

  // Signals
  isScrolled  = signal(false);
  showSearch  = signal(false);
  showUserMenu = signal(false);
  showMobile  = signal(false);

  // Live Search Signals
  searchQuery     = signal('');
  searchProducts  = signal<any[]>([]);
  searchShops     = signal<any[]>([]);
  isSearchingLive = signal(false);
  private searchTimeout: any = null;
  private allShopsCache: any[] = [];

  // من الـ services
  unreadCount = this.notifService.unreadCount;

  constructor() {
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.notifService.startPolling();
      } else {
        this.notifService.stopPolling();
      }
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showMobile.set(false);
        this.showUserMenu.set(false);
        this.showSearch.set(false);
      }
    });
  }

  onScroll() {
    this.isScrolled.set(window.scrollY > 20);
  }

  toggleSearch() {
    this.showSearch.update(v => !v);
    this.showUserMenu.set(false);
  }

  toggleUserMenu() {
    this.showUserMenu.update(v => !v);
    this.showSearch.set(false);
  }

  toggleMobile() {
    this.showMobile.update(v => !v);
  }

  scrollTo(id: string, event: Event) {
    event.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    this.showMobile.set(false);
  }

  doSearch(query: string) {
    if (!query.trim()) return;
    this.router.navigate(['/products'], { queryParams: { q: query.trim() } });
    this.showSearch.set(false);
    this.searchQuery.set('');
  }

  onSearchInput(val: string) {
    this.searchQuery.set(val);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);

    const q = val.trim();
    if (q.length < 2) {
      this.searchProducts.set([]);
      this.searchShops.set([]);
      this.isSearchingLive.set(false);
      return;
    }

    this.isSearchingLive.set(true);
    this.searchTimeout = setTimeout(() => {
      this.executeLiveSearch(q);
    }, 280);
  }

  private executeLiveSearch(q: string) {
    // 1. Products search
    this.aiService.searchProducts({ q }).subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.searchProducts.set(list.slice(0, 4));
        this.isSearchingLive.set(false);
      },
      error: () => {
        this.searchProducts.set([]);
        this.isSearchingLive.set(false);
      }
    });

    // 2. Shops search
    if (this.allShopsCache.length > 0) {
      this.filterShops(q);
    } else {
      this.buyerService.getShops().subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          this.allShopsCache = list;
          this.filterShops(q);
        },
        error: () => this.searchShops.set([])
      });
    }
  }

  private filterShops(q: string) {
    const lower = q.toLowerCase();
    const matched = this.allShopsCache.filter(s =>
      (s.name && s.name.toLowerCase().includes(lower)) ||
      (s.description && s.description.toLowerCase().includes(lower))
    );
    this.searchShops.set(matched.slice(0, 3));
  }

  goToProduct(product: any) {
    this.router.navigate(['/products', product.slug || product.id], { state: { product } });
    this.showSearch.set(false);
    this.searchQuery.set('');
  }

  goToShop(shop: any) {
    this.router.navigate(['/stores', shop.id]);
    this.showSearch.set(false);
    this.searchQuery.set('');
  }

  getItemImage(p: any): string {
    if (!p) return '';
    if (typeof p.primary_image === 'string') return p.primary_image;
    if (p.primary_image?.image_url) return p.primary_image.image_url;
    if (Array.isArray(p.images) && p.images.length > 0) {
      const img = p.images[0];
      return typeof img === 'string' ? img : (img?.image_url || img?.url || '');
    }
    if (Array.isArray(p.general_images) && p.general_images.length > 0) {
      return p.general_images[0]?.image_url || '';
    }
    return p.image_url || '';
  }

  async logout() {
    this.notifService.stopPolling();
    await this.authService.logout();
    this.showUserMenu.set(false);
  }
}
