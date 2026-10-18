import { Component, computed, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BuyerService } from '../../../core/services/buyer.service';
import { ProductService } from '../../../core/services/product.service';
import { AuthService } from '../../../core/services/auth.service';
import { AiService } from '../../../core/services/ai.service';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { LoginPromptComponent } from '@shared/components/login-prompt/login-prompt.component';

interface DisplayCategory {
  id: string | number;
  name: string;
  nameAr: string;
  icon: string;
  slug?: string;
}

@Component({
  selector: 'app-products-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ProductCardComponent, LoginPromptComponent],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.scss'
})
export class ProductsListComponent implements OnInit, OnDestroy {
  private buyerService   = inject(BuyerService);
  private productService = inject(ProductService);
  private aiService      = inject(AiService);
  private authService    = inject(AuthService);
  private router         = inject(Router);
  private route          = inject(ActivatedRoute);

  // ── حالة البحث والذكاء الاصطناعي (STEP 3) ──
  searchState        = signal<'idle'|'loading'|'results'|'no-results'|'ai-error'>('idle');
  searchQuery        = signal('');
  selectedCategories = signal<string[]>([]);
  selectedColors     = signal<string[]>([]);
  selectedSizes      = signal<string[]>([]);
  minPrice           = signal<number | null>(null);
  maxPrice           = signal<number | null>(null);
  products           = signal<any[]>([]);
  aiError            = signal('');

  categories      = signal<DisplayCategory[]>([]);
  showLoginPrompt = signal(false);
  sortBy          = signal<'trending' | 'newest' | 'price-low' | 'price-high' | 'rating'>('trending');

  // Debounce timer
  private searchTimer: any;

  selectedCategory = computed(() => {
    const sel = this.selectedCategories()[0];
    if (!sel) return null;
    const found = this.categories().find(c =>
      String(c.id) === String(sel) ||
      c.name === sel ||
      c.nameAr === sel ||
      c.slug === sel
    );
    return found ? found.id : sel;
  });

  filteredProducts = computed(() => {
    let list = this.products();
    switch (this.sortBy()) {
      case 'price-low':  return [...list].sort((a, b) => +a.price - +b.price);
      case 'price-high': return [...list].sort((a, b) => +b.price - +a.price);
      case 'rating':     return [...list].sort((a, b) =>
        +(b.rating?.average ?? b.average_rating ?? 0) - +(a.rating?.average ?? a.average_rating ?? 0));
      default: return list;
    }
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      let shouldSearch = false;
      if (params['category']) {
        this.selectedCategories.set([String(params['category'])]);
        shouldSearch = true;
      }
      if (params['q'] || params['search']) {
        this.searchQuery.set(params['q'] || params['search']);
        shouldSearch = true;
      }

      if (shouldSearch) {
        this.doSearch();
      } else {
        this.loadPublicProducts();
      }
    });

    this.loadCategories();
  }

  loadPublicProducts(): void {
    this.searchState.set('loading');
    this.aiError.set('');
    this.productService.getAllPublicProducts({ per_page: 50 }).subscribe({
      next: (res: any) => {
        const items = res?.data?.data ?? res?.data ?? [];
        if (items.length > 0) {
          this.products.set(items);
          this.productService.cacheProducts(items);
          this.searchState.set('results');
        } else {
          this.productService.getBuyerProducts({ per_page: 50 }).subscribe({
            next: (bRes: any) => {
              const bItems = bRes?.data?.data ?? bRes?.data ?? [];
              this.products.set(bItems);
              this.productService.cacheProducts(bItems);
              this.searchState.set(bItems.length > 0 ? 'results' : 'no-results');
            },
            error: () => {
              this.products.set([]);
              this.searchState.set('no-results');
            }
          });
        }
      },
      error: () => {
        this.productService.getBuyerProducts({ per_page: 50 }).subscribe({
          next: (bRes: any) => {
            const bItems = bRes?.data?.data ?? bRes?.data ?? [];
            this.products.set(bItems);
            this.searchState.set(bItems.length > 0 ? 'results' : 'no-results');
          },
          error: () => {
            this.searchState.set('ai-error');
            this.aiError.set('تعذر تحميل المنتجات حالياً');
            this.products.set([]);
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  private loadCategories(): void {
    this.buyerService.getDynamicCategories().subscribe({
      next: (res) => {
        const mapped: DisplayCategory[] = (res.data ?? []).map((cat: any) => ({
          id:     cat.id,
          name:   cat.name,
          nameAr: cat.name,
          icon:   'fas fa-tag',
          slug:   cat.slug
        }));
        this.categories.set(mapped);
        if (this.selectedCategories().length > 0) {
          this.doSearch();
        }
      },
      error: () => {}
    });
  }

  // Compatibility signals for existing template
  isLoading        = computed(() => this.searchState() === 'loading');
  isLoadingMore    = signal(false);
  error            = computed(() => this.aiError());
  currentPage      = signal(1);
  totalPages       = signal(1);
  totalCount       = computed(() => this.products().length);
  readonly PER_PAGE = 20;
  hasMore          = computed(() => false);
  isAiSearchActive = computed(() => this.searchState() === 'results');

  loadProducts(page = 1, append = false): void {
    this.doSearch();
  }

  loadMore(): void {}

  selectCategory(id: string | number | null): void {
    if (id == null) {
      this.selectedCategories.set([]);
    } else {
      this.selectedCategories.set([String(id)]);
    }
    this.doSearch();
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
    clearTimeout(this.searchTimer);
    // debounce 400ms — لا ترسل طلب مع كل حرف
    this.searchTimer = setTimeout(() => {
      this.doSearch();
    }, 400);
  }

  doSearch(): void {
    const q = this.searchQuery();
    const cats = this.selectedCategories();
    const cols = this.selectedColors();
    const sizes = this.selectedSizes();
    const minP = this.minPrice();
    const maxP = this.maxPrice();

    const hasFilter = q || cats.length || cols.length ||
      sizes.length || minP != null || maxP != null;

    if (!hasFilter) {
      this.loadPublicProducts();
      return;
    }

    this.searchState.set('loading');
    this.aiError.set('');

    // تحويل معرّفات أو slugs التصنيفات إلى أسمائها النصية الفعلية لأن محرك البحث في الباكيند يطابق بالاسم العربي
    const resolvedCats = cats.map(catVal => {
      const found = this.categories().find(c =>
        String(c.id) === String(catVal) ||
        c.name === catVal ||
        c.nameAr === catVal ||
        c.slug === catVal
      );
      return found ? found.name : catVal;
    });

    this.aiService.searchProducts({
      q, categories: resolvedCats, colors: cols,
      sizes, minPrice: minP ?? undefined,
      maxPrice: maxP ?? undefined
    }).subscribe({
      next: (res) => {
        if (!res.success) {
          this.searchState.set('ai-error');
          this.aiError.set(res.message ?? 'خدمة البحث غير متاحة حالياً');
          this.products.set([]);
          return;
        }
        if (res.data.length === 0) {
          this.searchState.set('no-results');
          this.products.set([]);
        } else {
          this.searchState.set('results');
          this.products.set(res.data);
          this.productService.cacheProducts(res.data);
        }
      },
      error: () => {
        this.searchState.set('ai-error');
        this.aiError.set('فشل الاتصال بخدمة البحث');
        this.products.set([]);
      }
    });
  }

  goToProduct(slugOrId: string | number): void {
    const product = this.products().find(p =>
      (p.slug && p.slug === slugOrId) || p.id === slugOrId
    );
    if (product) {
      this.productService.cacheProduct(product);
    }
    const target = product?.slug || slugOrId;
    this.router.navigate(['/products', target], {
      state: { product: product ?? null }
    });
  }

  toggleWishlist(productId: string | number): void {
    if (!this.authService.isLoggedIn()) {
      this.showLoginPrompt.set(true);
      return;
    }
    this.buyerService.toggleWishlist(String(productId)).subscribe({
      next: (res) => {
        const isAdded = res.action === 'added';
        this.products.update(list => list.map(p => {
          if (p.id == productId) {
            return { ...p, inWishlist: isAdded, is_favorited: isAdded };
          }
          return p;
        }));
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.error?.error ?? 'فشل تحديث المفضلة';
        alert(msg);
      }
    });
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategories.set([]);
    this.selectedColors.set([]);
    this.selectedSizes.set([]);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.loadPublicProducts();
  }

  formatPrice(price: string | number): string {
    return (+price).toLocaleString('ar-LY') + ' د.ل';
  }
}
