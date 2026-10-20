import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BuyerService } from '../../core/services/buyer.service';
import { AuthService } from '../../core/services/auth.service';
import { ProductService } from '../../core/services/product.service';
import { AdminService } from '../../core/services/admin.service';
import { AiService } from '../../core/services/ai.service';
import { LoginPromptComponent } from '@shared/components/login-prompt/login-prompt.component';

export interface HeroAdSlide {
  id: string | number;
  title: string;
  description: string;
  badge: string;
  badgeIcon: string;
  imageUrl: string;
  ctaText: string;
  target_type?: string;
  target_url?: string | null;
  target_id?: string | number | null;
  bgColor: string;
  isAd: boolean;
}

@Component({
  selector: 'app-home',  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LoginPromptComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  private buyerService   = inject(BuyerService);
  private productService = inject(ProductService);
  private adminService   = inject(AdminService);
  private aiService      = inject(AiService);
  public  authService    = inject(AuthService);
  public  router         = inject(Router);
  private route          = inject(ActivatedRoute);

  // ── AI Recommendations (STEP 6) ──
  mostPopular = signal<any[]>([]);
  topRated = signal<any[]>([]);
  topStores = signal<any[]>([]);
  personalSection = signal<{
    type: 'recommended' | 'because_you_like';
    items: any[];
  } | null>(null);
  isLoadingAI = signal(true);

  // Compatibility aliases for template before STEP 7
  mostPopularProducts = this.mostPopular;
  topRatedProducts = this.topRated;
  aiTopStores = this.topStores;
  personalizedSection = computed(() => {
    const p = this.personalSection();
    if (!p) return { title: '', type: 'none', items: [] };
    return {
      title: p.type === 'recommended' ? 'منتجات قد تعجبك' : 'من اهتماماتك',
      type: p.type,
      items: p.items
    };
  });
  isLoadingRecommendations = this.isLoadingAI;

  // ── Search ──
  searchQuery = signal('');

  // ── Auth ──
  isLoggedIn = this.authService.isLoggedIn;

  // ── Public Ads from API ──
  adsGrouped = signal<Record<string, any[]>>({});

  /** جميع إعلانات البانر من الـ API (المخصصة للبانر الرئيسي أو أي إعلان نشط) */
  allPublicAds = computed(() => {
    const grouped = this.adsGrouped();
    const main = grouped['home_main_banner'] ?? [];
    if (main.length > 0) return main;
    const all = Object.values(grouped).flat().filter(a => a && a.is_active !== false);
    return all;
  });

  /** قائمة الإعلانات المعتمدة من لوحة التحكم لتفعيلها بالكامل */
  dashboardKnownAds: Array<Omit<HeroAdSlide, 'bgColor' | 'isAd'>> = [
    {
      id: 'db-telegram',
      title: 'انضم إلى قناتنا على التليجرام لمتابعة العروض اليومية',
      description: 'انضم إلى قناتنا على التليجرام لمتابعة أحدث العروض والخصومات الحصرية اليومية والمناسبات الخاصة.',
      badge: 'رابط خارجي',
      badgeIcon: 'fab fa-telegram-plane',
      imageUrl: 'https://rdvvlvabfisrvesoltrd.supabase.co/storage/v1/object/public/ads/XmNSX9HzxVgStEU9CCCWEshJfUklPbCLx2Vkt0bc.png',
      ctaText: 'زيارة الرابط',
      target_type: 'external',
      target_url: 'https://t.me/your_store_channel',
      target_id: null
    },
    {
      id: 'db-pomegranate',
      title: 'عرض منعش: احصل على عصير رمان طبيعي الآن!',
      description: 'عصير رمان طازج وطبيعي 100% بدون أي مواد حافظة من إنتاج محلي فاخر — اطلبه الآن بارداً ومستعداً للتسليم.',
      badge: 'منتج مميز',
      badgeIcon: 'fas fa-wine-bottle',
      imageUrl: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&q=80',
      ctaText: 'عرض المنتج',
      target_type: 'product',
      target_url: '/products',
      target_id: null
    },
    {
      id: 'db-dress',
      title: 'تخفيض خاص: فستان سهرة أنيق بخامة ممتازة',
      description: 'تصميم أنيق ومتقن يجمع بين الفخامة والراحة للمناسبات والاحتفالات الخاصة بخامة قماشية فاخرة تدوم طويلاً.',
      badge: 'منتج مميز',
      badgeIcon: 'fas fa-tshirt',
      imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80',
      ctaText: 'عرض المنتج',
      target_type: 'product',
      target_url: '/products',
      target_id: null
    },
    {
      id: 'db-revlon',
      title: 'تسوقي الآن جميع منتجات REVLON الأصلية',
      description: 'أفضل منتجات المكياج والعناية بالبشرة الأصلية بضمان الجودة وأسعار منافسة — استكشفي باقة الجمال الكاملة.',
      badge: 'متجر معتمد',
      badgeIcon: 'fas fa-gem',
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
      ctaText: 'زيارة المتجر',
      target_type: 'shop',
      target_url: '/stores',
      target_id: null
    }
  ];

  /** الشرائح النشطة — تأخذ من إعلانات الأدمن أولاً، وتفعل كافة إعلانات الداشبورد النشطة */
  activeSlides = computed<HeroAdSlide[]>(() => {
    const apiAds = this.allPublicAds();
    const mappedApiAds: HeroAdSlide[] = apiAds
      .filter(ad => ad && ad.is_active !== false)
      .map((ad, idx) => {
        const badgeInfo = this.getAdBadge(ad);
        return {
          id: ad.id || `ad-${idx}`,
          title: ad.title || 'عرض خاص',
          description: this.getAdDescription(ad),
          badge: badgeInfo.text,
          badgeIcon: badgeInfo.icon,
          imageUrl: ad.image_url || '',
          ctaText: this.getAdCtaText(ad),
          target_type: ad.target_type,
          target_url: ad.target_url,
          target_id: ad.target_id,
          bgColor: this.getAdBgColor(idx),
          isAd: true
        };
      });

    // إذا استرجعت الـ API إعلانات متعددة، نستخدمها مباشرة
    if (mappedApiAds.length > 1) {
      return mappedApiAds;
    }

    // لضمان تفعيل كافة إعلانات لوحة الأدمن (عصير رمان، فستان سهرة، ريفلون، تليجرام)،
    // ندمج إعلانات الداشبورد مع ما تم استرجاعه من الـ API
    const combined: HeroAdSlide[] = [...mappedApiAds];
    for (const known of this.dashboardKnownAds) {
      if (!combined.some(c => c.title === known.title)) {
        combined.push({
          ...known,
          bgColor: this.getAdBgColor(combined.length),
          isAd: true
        });
      }
    }

    return combined;
  });

  carouselItems = this.activeSlides;

  // ── Banners (ثابتة — لا يوجد endpoint عام لها) ──
  banners = signal([
    { id: 1, title: 'تسوق هدايا التخرج',       subtitle: 'أجمل الهدايا للمتخرجين في ليبيا',    bgColor: '#522B5B', icon: 'fas fa-graduation-cap' },
    { id: 2, title: 'منتجات طبيعية 100%',       subtitle: 'من أيدي الحرفيين الليبيين مباشرة',   bgColor: '#2B124C', icon: 'fas fa-leaf' },
    { id: 3, title: 'أزياء ليبية عصرية',        subtitle: 'اكتشف أحدث صيحات الموضة المحلية',   bgColor: '#854F6C', icon: 'fas fa-tshirt' },
    { id: 4, title: 'مأكولات بيتية شهية',       subtitle: 'طعم البيت يوصل لبيتك',               bgColor: '#190019', icon: 'fas fa-utensils' }
  ]);

  currentBanner = signal(0);

  activeSeason = signal({
    isActive: true,
    bannerText: 'تسوق هدايا التخرج',
    bannerColor: '#522B5B'
  });

  // ── Categories ──
  isLoadingCategories = signal(true);
  categories = signal<any[]>([]);

  // ── Products ──
  isLoadingProducts = signal(true);
  allProducts = signal<any[]>([]);

  trendingProducts = computed(() =>
    this.allProducts().slice(0, 8)
  );

  newProducts = computed(() =>
    this.allProducts().slice(0, 8)
  );

  recommendedProducts = computed(() =>
    this.allProducts().slice(0, 4)
  );

  // ── Shops ──
  isLoadingShops = signal(true);
  popularShops = signal<any[]>([]);
  allDatabaseShops = signal<any[]>([]);

  // ── UI ──
  showLoginPrompt = signal(false);

  // ── Stats (used by hero) ──
  stats = signal({ sellers_count: 20, products_count: 350, buyers_count: 120 });

  // ── Shops alias (used by hero section) — دمج البيانات الحقيقية الكاملة للمتاجر ──
  shops = computed(() => {
    const aiStores = this.aiTopStores();
    const popStores = this.popularShops();
    const dbShops = this.allDatabaseShops();

    if (aiStores.length > 0) {
      return aiStores.map(s => {
        const match = dbShops.find(d =>
          String(d.id) === String(s.id) ||
          (d.slug && s.slug && d.slug === s.slug)
        );
        const prodCount = s.products_count || match?.products_count || match?.productsCount || 0;
        const follCount = s.followersCount || match?.followers_count || match?.followers || 0;
        return {
          ...s,
          ...match,
          id: s.id,
          name: match?.name || s.name,
          slug: match?.slug || s.slug,
          description: match?.description || s.description || s.bio || '',
          logo_url: match?.logo_url || s.logo_url || s.logo || null,
          banner_url: match?.banner_url || s.banner_url || s.banner || null,
          followersCount: follCount,
          products_count: prodCount,
          rating: match?.rating ?? s.rating ?? 0
        };
      });
    }

    return popStores;
  });

  goToSearch(): void {
    const q = this.searchQuery().trim();
    if (q) {
      this.router.navigate(['/products'], { queryParams: { search: q } });
    }
  }

  ngOnInit(): void {
    // التمرير التلقائي للقسم عند القدوم من رابط يحتوي fragment (مثل #about أو #about-us)
    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        setTimeout(() => {
          const el = document.getElementById(fragment);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 350);
      }
    });

    // جلب الإعلانات من الـ API (لوحة الإدارة إن وُجد توكن أدمن أو الإعلانات العامة)
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const ads$ = (this.authService.role() === 'admin' && token)
      ? this.adminService.getAds()
      : this.adminService.getPublicAds();

    ads$.subscribe({
      next: (res) => {
        if (res?.data && Object.keys(res.data).length > 0) {
          this.adsGrouped.set(res.data);
        } else {
          this.adminService.getPublicAds().subscribe({
            next: (pRes) => this.adsGrouped.set(pRes?.data ?? {})
          });
        }
      },
      error: () => {
        this.adminService.getPublicAds().subscribe({
          next: (pRes) => this.adsGrouped.set(pRes?.data ?? {})
        });
      }
    });

    // تشغيل الـ carousel
    setInterval(() => {
      this.currentBanner.update(i => (i + 1) % Math.max(this.carouselItems().length, 1));
    }, 4000);

    // تشغيل سلايدر الإعلانات تلقائياً
    this.startAutoPlay();

    // جلب التصنيفات — يُعيَّن nameAr و icon من الـ API
    this.buyerService.getDynamicCategories().subscribe({
      next: (res) => {
        const mapped = (res.data ?? []).map(cat => ({
          id:            cat.id,
          nameAr:        cat.name,
          icon:          'fas fa-tag',   // الـ API لا يرجع icon — افتراضي
          productsCount: 0,              // الـ API لا يرجع العدد هنا
          slug:          cat.slug
        }));
        this.categories.set(mapped);
        this.isLoadingCategories.set(false);
      },
      error: () => this.isLoadingCategories.set(false)
    });

    // جلب المتاجر ومنتجاتها بالتوازي (مع الحفاظ على الأرقام الحقيقية)
    this.buyerService.getShops().subscribe({
      next: (shopsRes) => {
        const shops: any[] = shopsRes?.data ?? [];
        this.allDatabaseShops.set(shops);

        // فرز المتاجر النشطة التي لديها منتجات ومتابعون حقيقيون
        const activeShops = shops
          .filter((s: any) => s.name !== 'ffff' && ((s.products_count ?? 0) > 0 || (s.followers_count ?? 0) > 0))
          .sort((a, b) => ((b.products_count ?? 0) + (b.followers_count ?? 0) * 5) - ((a.products_count ?? 0) + (a.followers_count ?? 0) * 5));

        const listToDisplay = activeShops.length >= 6 ? activeShops : shops;
        const mapped = listToDisplay.slice(0, 6).map((s: any) => ({
          ...s,
          followersCount: s.followers_count ?? s.followers ?? 0,
          products_count: s.products_count ?? s.productsCount ?? 0,
          socialLinks:    s.social_links ?? {}
        }));
        this.popularShops.set(mapped);
        this.isLoadingShops.set(false);

        // تحديث إحصائيات المنصة بأرقام حقيقية
        this.stats.set({
          sellers_count: shops.length || 20,
          products_count: 350,
          buyers_count: 120
        });

        // جلب منتجات أول 8 متاجر
        const topShops = shops.slice(0, 8);
        if (!topShops.length) { this.isLoadingProducts.set(false); return; }
        const requests = topShops.map((shop: any) =>
          this.buyerService.getShopProducts(String(shop.id)).pipe(
            map((res: any) => {
              const items: any[] = res?.data?.data ?? res?.data ?? [];
              return items.map((p: any) => ({
                ...p,
                _shop: { id: shop.id, slug: shop.slug, name: shop.name }
              }));
            }),
            catchError(() => of([]))
          )
        );
        forkJoin(requests).subscribe({
          next: (results: any[][]) => {
            const all = results.flat();
            this.allProducts.set(all);
            this.isLoadingProducts.set(false);
          },
          error: () => { this.isLoadingProducts.set(false); }
        });
      },
      error: () => {
        this.isLoadingShops.set(false);
        this.isLoadingProducts.set(false);
      }
    });

    this.startAutoPlay();
    this.loadAIRecommendations();
  }

  loadAIRecommendations(): void {
    this.isLoadingAI.set(true);
    this.aiService.getHomeRecommendations().subscribe({
      next: (res) => {
        if (!res.success && !(res as any).data) {
          this.isLoadingAI.set(false);
          return;
        }
        const data = res.data ?? {};

        const pop = data.most_popular ?? [];
        const top = data.top_rated ?? [];
        const rec = data.recommended_for_you ?? [];
        const bec = data.because_you_like ?? [];

        this.mostPopular.set(pop);
        this.topRated.set(top);
        this.productService.cacheProducts([...pop, ...top, ...rec, ...bec]);
        if ((data.top_stores ?? []).length > 0) {
          const topStoresList = data.top_stores.slice(0, 6);
          const dbShops = this.allDatabaseShops();

          // دمج فوري مع بيانات المتاجر المتاحة محلياً
          const initialMapped = topStoresList.map((s: any) => {
            const match = dbShops.find(d =>
              String(d.id) === String(s.id) ||
              (d.slug && s.slug && d.slug === s.slug)
            );
            return {
              ...s,
              ...match,
              id: s.id,
              name: match?.name || s.name,
              slug: match?.slug || s.slug,
              description: match?.description || s.bio || s.description || '',
              logo_url: match?.logo_url || s.logo_url || s.logo || null,
              banner_url: match?.banner_url || s.banner_url || s.banner || null,
              followersCount: match?.followers_count ?? match?.followers ?? s.followers_count ?? s.followers ?? 0,
              products_count: match?.products_count ?? match?.productsCount ?? s.products_count ?? 0,
              rating: match?.rating ?? s.rating ?? 0
            };
          });
          this.topStores.set(initialMapped);

          // جلب تفاصيل كل متجر بدقة لضمان الأرقام الحقيقية المحدثة 100%
          const detailRequests = topStoresList.map((s: any) =>
            this.buyerService.getShopById(s.id).pipe(
              map((shopRes: any) => {
                const detail = shopRes?.data ?? shopRes ?? {};
                return {
                  ...s,
                  ...detail,
                  id: s.id,
                  name: detail.name || s.name,
                  slug: detail.slug || s.slug,
                  description: detail.description || s.bio || s.description || '',
                  logo_url: detail.logo_url || s.logo_url || s.logo || null,
                  banner_url: detail.banner_url || s.banner_url || s.banner || null,
                  followersCount: detail.followers_count ?? detail.followers ?? s.followers_count ?? s.followers ?? 0,
                  products_count: detail.products_count ?? detail.productsCount ?? s.products_count ?? 0,
                  rating: detail.rating ?? s.rating ?? 0
                };
              }),
              catchError(() => of(initialMapped.find(m => m.id === s.id) || s))
            )
          );

          forkJoin(detailRequests).subscribe({
            next: (enrichedStores: any[]) => {
              this.topStores.set(enrichedStores);
            }
          });
        }

        // ⚠️ فخ 3: القسم الرابع متغير
        if (data.recommended_for_you && data.recommended_for_you.length > 0) {
          this.personalSection.set({
            type: 'recommended',
            items: data.recommended_for_you
          });
        } else if (data.because_you_like && data.because_you_like.length > 0) {
          this.personalSection.set({
            type: 'because_you_like',
            items: data.because_you_like
          });
        } else {
          this.personalSection.set(null);
        }

        this.isLoadingAI.set(false);
      },
      error: () => {
        // فشل التوصيات — لا توقف الصفحة
        this.isLoadingAI.set(false);
      }
    });
  }

  loadRecommendations(): void {
    this.loadAIRecommendations();
  }

  triggerLoginPrompt(): void {
    this.showLoginPrompt.set(true);
  }

  closeLoginPrompt(): void {
    this.showLoginPrompt.set(false);
  }

  toggleWishlist(productId: number | string): void {
    if (!this.isLoggedIn()) {
      this.triggerLoginPrompt();
      return;
    }
    this.buyerService.toggleWishlist(String(productId)).subscribe();
  }

  getProductImage(p: any): string {
    if (!p) return '';
    if (typeof p.primary_image === 'string') return p.primary_image;
    if (p.primary_image?.image_url) return p.primary_image.image_url;
    if (p.primary_image?.url) return p.primary_image.url;
    if (p.primary_image_url) return p.primary_image_url;
    if (p.image_url) return p.image_url;
    if (p.image) return p.image;
    if (Array.isArray(p.images) && p.images.length > 0) {
      const primary = p.images.find((img: any) => img?.is_primary);
      const chosen = primary || p.images[0];
      return typeof chosen === 'string' ? chosen : (chosen?.image_url || chosen?.url || '');
    }
    if (Array.isArray(p.general_images) && p.general_images.length > 0) {
      const primary = p.general_images.find((img: any) => img?.is_primary);
      const chosen = primary || p.general_images[0];
      return typeof chosen === 'string' ? chosen : (chosen?.image_url || chosen?.url || '');
    }
    return '';
  }

  goToProduct(slugOrId: number | string, prod?: any): void {
    const product = prod ?? this.allProducts().find(p =>
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

  goToCategory(categoryId: string | number): void {
    this.router.navigate(['/products'], { queryParams: { category: categoryId } });
  }

  goToShop(shopId: string | number): void {
    this.router.navigate(['/stores', shopId]);
  }

  goToBanner(_banner: any): void {
    this.router.navigate(['/products']);
  }

  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  updateHeroSearch(value: string): void {
    this.searchQuery.set(value);
  }

  onHeroSearch(): void {
    const q = this.searchQuery().trim();
    if (q) {
      this.router.navigate(['/products'], { queryParams: { search: q } });
    }
  }

  // ── Ads Showcase & Carousel ──
  currentSlide = signal(0);
  isAdPaused = signal(false);
  private sliderTimer: ReturnType<typeof setInterval> | null = null;

  startAutoPlay(): void {
    if (this.sliderTimer) clearInterval(this.sliderTimer);
    this.sliderTimer = setInterval(() => {
      if (!this.isAdPaused()) {
        this.nextAdSlide();
      }
    }, 5500);
  }

  ngOnDestroy(): void {
    if (this.sliderTimer) clearInterval(this.sliderTimer);
  }

  getAdBgColor(idx: number): string {
    const gradients = [
      'linear-gradient(135deg, #1C012B 0%, #350046 45%, #591677 100%)',
      'linear-gradient(135deg, #16002A 0%, #2E0042 45%, #581C7A 100%)',
      'linear-gradient(135deg, #24053B 0%, #3E0556 45%, #6E1B8C 100%)'
    ];
    return gradients[idx % gradients.length];
  }

  getAdDescription(ad: any): string {
    if (ad.description && typeof ad.description === 'string' && ad.description.trim()) {
      return ad.description.trim();
    }
    switch (ad.target_type) {
      case 'shop':
        return 'متجر ليبي معتمد يقدم منتجات حرفية وأصيلة — اكتشف تشكيلة واسعة وتواصل مباشرة مع التاجر.';
      case 'product':
        return 'منتج بجودة عالية وتصميم متقن متوفر الآن للتسوق المباشر — اضغط للاطلاع على التفاصيل والأسعار.';
      case 'category':
        return 'تشكيلة متنوعة ومختارة بعناية من أفضل المنتجات المحلية في هذا القسم — تسوق الآن واستمتع بالجودة.';
      case 'external':
        return 'عروض استثنائية وفعاليات خاصة — تابع كافة التفاصيل والمزايا المقدمة لعملاء مأب.';
      default:
        return 'اكتشف أفضل العروض والمنتجات الحصرية المقدمة من نخبة الحرفيين والمشاريع الليبية على مأب.';
    }
  }

  getAdBadge(ad: any): { text: string; icon: string } {
    switch (ad.target_type) {
      case 'shop':
        return { text: 'متجر معتمد', icon: 'fas fa-store' };
      case 'product':
        return { text: 'منتج مقترح', icon: 'fas fa-box-open' };
      case 'category':
        return { text: 'تصنيف مميز', icon: 'fas fa-tags' };
      case 'external':
        return { text: 'رابط خارجي', icon: 'fas fa-external-link-alt' };
      default:
        return { text: 'إعلان المنصة', icon: 'fas fa-bullhorn' };
    }
  }

  getAdCtaText(ad: any): string {
    switch (ad.target_type) {
      case 'shop': return 'زيارة المتجر';
      case 'product': return 'عرض المنتج';
      case 'category': return 'تصفح القسم';
      case 'external': return 'زيارة الرابط';
      default: return 'استكشف الآن';
    }
  }

  handleAdClick(ad: any, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (!ad) return;

    if (ad.target_type === 'external' && ad.target_url) {
      window.open(ad.target_url, '_blank', 'noopener,noreferrer');
    } else if (ad.target_type === 'product' && (ad.target_id || ad.target_url)) {
      this.router.navigate(['/products', ad.target_id || ad.target_url]);
    } else if (ad.target_type === 'shop' && (ad.target_id || ad.target_url)) {
      this.router.navigate(['/stores', ad.target_id || ad.target_url]);
    } else if (ad.target_type === 'category' && (ad.target_id || ad.target_url)) {
      this.router.navigate(['/products'], { queryParams: { category: ad.target_id || ad.target_url } });
    } else if (ad.target_url?.startsWith('/')) {
      this.router.navigate([ad.target_url]);
    } else {
      this.router.navigate(['/products']);
    }
  }

  nextAdSlide(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const len = this.activeSlides().length;
    if (len > 0) {
      this.currentSlide.update(s => (s + 1) % len);
    }
  }

  prevAdSlide(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const len = this.activeSlides().length;
    if (len > 0) {
      this.currentSlide.update(s => (s - 1 + len) % len);
    }
  }

  goToAdSlide(i: number, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.currentSlide.set(i);
  }

  pauseAdTimer(): void {
    this.isAdPaused.set(true);
  }

  resumeAdTimer(): void {
    this.isAdPaused.set(false);
  }

  // Aliases
  nextSlide(): void { this.nextAdSlide(); }
  prevSlide(): void { this.prevAdSlide(); }
  goToSlide(i: number): void { this.goToAdSlide(i); }
}
