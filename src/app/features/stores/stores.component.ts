import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { BuyerService, ShopNew, DynamicCategory } from '../../core/services/buyer.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-stores',  templateUrl: './stores.component.html',
  styleUrl: './stores.component.scss'
})
export class StoresComponent implements OnInit {
  private buyerService = inject(BuyerService);
  private authService = inject(AuthService);
  protected router = inject(Router);

  isLoading = signal(true);
  isLoadingCategories = signal(true);
  error = signal('');
  shops = signal<ShopNew[]>([]);
  categories = signal<DynamicCategory[]>([]);
  selectedCategoryIds = signal<string[]>([]);
  activeFilter = signal<'all'|'following'>('all');
  followingId = signal<string | null>(null);
  searchQuery = signal('');

  filteredShops = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.shops();
    return this.shops().filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    // جلب التصنيفات الحقيقية من الـ API
    this.buyerService.getDynamicCategories().subscribe({
      next: (res) => {
        this.categories.set(res.data);
        this.isLoadingCategories.set(false);
      },
      error: () => this.isLoadingCategories.set(false)
    });
    this.loadShops();
  }

  loadShops(): void {
    this.isLoading.set(true);
    this.error.set('');
    // لو فيه تصنيفات محددة نبعتها، وإلا نجلب الكل
    const catIds = this.activeFilter() === 'all'
      ? this.selectedCategoryIds()
      : [];

    if (this.activeFilter() === 'following') {
      this.buyerService.getUserFollowing().subscribe({
        next: (res) => {
          this.shops.set(res.data.data as any);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('فشل تحميل المتاجر');
          this.isLoading.set(false);
        }
      });
      return;
    }

    this.buyerService.getShops(
      catIds.length > 0 ? catIds : undefined,
      50
    ).subscribe({
      next: (res) => {
        this.shops.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('فشل تحميل المتاجر');
        this.isLoading.set(false);
      }
    });
  }

  toggleCategory(id: string): void {
    this.selectedCategoryIds.update(ids =>
      ids.includes(id)
        ? ids.filter(i => i !== id)
        : [...ids, id]
    );
    // إعادة تحميل المتاجر بعد تغيير التصنيف
    this.loadShops();
  }

  changeFilter(filter: 'all'|'following'): void {
    this.activeFilter.set(filter);
    this.selectedCategoryIds.set([]);
    this.loadShops();
  }

  isFollowing(shop: ShopNew): boolean {
    return shop.is_following;
  }

  toggleFollow(shop: ShopNew): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.followingId.set(shop.id);
    const action = shop.is_following
      ? this.buyerService.unfollowShop(shop.id)
      : this.buyerService.followShop(shop.id);

    action.subscribe({
      next: () => {
        this.followingId.set(null);
        // تحديث حالة الـ is_following محلياً بدون reload
        this.shops.update(shops =>
          shops.map(s =>
            s.id === shop.id
              ? { ...s, is_following: !s.is_following }
              : s
          )
        );
      },
      error: () => this.followingId.set(null)
    });
  }

  private readonly serverBase = environment.apiUrl.replace('/api', '');

  getImageUrl(url: string | null | undefined): string {
    if (!url || url.trim() === '') return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // relative path — prepend server base
    return this.serverBase + (url.startsWith('/') ? '' : '/') + url;
  }

  updateSearch(v: string): void {
    this.searchQuery.set(v);
  }
}
