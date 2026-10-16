import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { BuyerService } from '../../../core/services/buyer.service';
import { OrderService } from '../../../core/services/order.service';
import { LoginPromptComponent } from '@shared/components/login-prompt/login-prompt.component';
import { ReportModalComponent } from '@shared/components/report-modal/report-modal.component';
import { AiService } from '../../../core/services/ai.service';

@Component({
  selector: 'app-product-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, LoginPromptComponent, ReportModalComponent],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss'
})
export class ProductDetailsComponent implements OnInit {
  private productService = inject(ProductService);
  private buyerService   = inject(BuyerService);
  private cartService    = inject(CartService);
  private orderService   = inject(OrderService);
  private aiService      = inject(AiService);
  public  authService    = inject(AuthService);
  private route          = inject(ActivatedRoute);
  public  router         = inject(Router);

  // ── حالة ──
  isLoading          = signal(true);
  product            = signal<any>(null);
  error              = signal('');
  isAddingToCart     = signal(false);
  isInWishlist       = signal(false);
  isTogglingWishlist = signal(false);
  showLoginPrompt    = signal(false);
  selectedColorId    = signal('');
  selectedShadeId    = signal('');
  selectedSizeId     = signal('');
  quantity           = signal(1);

  // نوع الـ variant المختار: 'color' | 'shade' | ''
  variantMode        = signal<'color' | 'shade' | ''>('');

  // ── Signals للـ HTML الجديد ──
  activeImage  = signal<string>('');
  activeTab    = signal<'desc' | 'features' | 'reviews'>('desc');
  addedToCart  = signal(false);

  @ViewChild(ReportModalComponent)
  reportModal!: ReportModalComponent;

  openReport(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.reportModal.open(
      'product',
      this.product()?.id ?? '',
      this.product()?.title ?? 'هذا المنتج'
    );
  }

  resolveImageUrl(item: any): string {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.image_url || item.url || item.path || item.file_url || '';
  }

  normalizeProductData(raw: any): any {
    if (!raw) return raw;
    const p = { ...raw };

    // 1. استخراج الصور العامة من grouped_images إن لم تكن مصفوفة عامة صريحة
    if ((!p.general_images || !p.general_images.length) && p.grouped_images?.general?.length) {
      p.general_images = p.grouped_images.general;
    }

    // 2. ربط صور الألوان من grouped_images إن لم تكن داخل كائن اللون
    if (p.colors && p.grouped_images) {
      p.colors = p.colors.map((c: any) => ({
        ...c,
        images: (c.images && c.images.length) ? c.images : (p.grouped_images[c.id] || [])
      }));
    }

    // 3. استخراج وتأكيد الصورة الأساسية (primary_image)
    if (!p.primary_image) {
      let foundPrimary: any = null;
      if (p.general_images?.length) {
        foundPrimary = p.general_images.find((img: any) => img.is_primary) || p.general_images[0];
      } else if (p.grouped_images) {
        for (const k of Object.keys(p.grouped_images)) {
          if (Array.isArray(p.grouped_images[k]) && p.grouped_images[k].length) {
            foundPrimary = p.grouped_images[k].find((img: any) => img.is_primary) || p.grouped_images[k][0];
            if (foundPrimary) break;
          }
        }
      } else if (p.images?.length) {
        foundPrimary = p.images.find((img: any) => img.is_primary) || p.images[0];
      }
      if (foundPrimary) {
        p.primary_image = foundPrimary;
      }
    }

    return p;
  }

  getImagesList(): any[] {
    const p = this.product();
    if (!p) return [];

    const colorId = this.selectedColorId();
    const shadeId = this.selectedShadeId();

    // 1. إذا تم اختيار درجة ولديها صور
    if (shadeId) {
      const shade = (p.shades ?? []).find((s: any) => s.id === shadeId);
      if (shade?.images?.length) return shade.images;
      if (p.grouped_images?.[shadeId]?.length) return p.grouped_images[shadeId];
    }

    // 2. إذا تم اختيار لون ولديه صور خاصة به
    if (colorId) {
      const color = (p.colors ?? []).find((c: any) => c.id === colorId);
      if (color?.images?.length) return color.images;
      if (p.grouped_images?.[colorId]?.length) return p.grouped_images[colorId];
    }

    // 3. الصور العامة للمنتج
    if (p.general_images?.length) return p.general_images;
    if (p.grouped_images?.general?.length) return p.grouped_images.general;

    // 4. مصفوفة الصور المسطحة
    if (p.images?.length) return p.images;

    // 5. أي صور في أي مجموعة داخل grouped_images
    if (p.grouped_images && typeof p.grouped_images === 'object') {
      const all: any[] = [];
      for (const k of Object.keys(p.grouped_images)) {
        if (Array.isArray(p.grouped_images[k])) {
          all.push(...p.grouped_images[k]);
        }
      }
      if (all.length) return all;
    }

    // 6. أي صور في أي لون آخر
    for (const c of (p.colors ?? [])) {
      if (c.images?.length) return c.images;
    }

    // 7. صورة الغلاف المنفردة
    if (p.primary_image) {
      return [p.primary_image];
    }
    if (p.image || p.image_url) {
      return [{ id: 'main', image_url: p.image || p.image_url }];
    }

    return [];
  }

  getProductImage(): string {
    const p = this.product();
    if (!p) return '';

    if (this.activeImage()) {
      return this.activeImage();
    }

    // 1. فحص قائمة الصور الحالية
    const list = this.getImagesList();
    if (list.length > 0) {
      const primaryInList = list.find((img: any) => img.is_primary);
      const url = this.resolveImageUrl(primaryInList || list[0]);
      if (url) return url;
    }

    // 2. فحص primary_image
    if (p.primary_image) {
      const url = this.resolveImageUrl(p.primary_image);
      if (url) return url;
    }

    // 3. فحص الحقول المباشرة
    if (p.image) return p.image;
    if (p.image_url) return p.image_url;

    // 4. فحص الصور العامة
    if (p.general_images?.length) {
      const url = this.resolveImageUrl(p.general_images[0]);
      if (url) return url;
    }
    if (p.grouped_images?.general?.length) {
      const url = this.resolveImageUrl(p.grouped_images.general[0]);
      if (url) return url;
    }

    return '';
  }

  getItemImage(p: any): string {
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

  getAverageRating(): number {
    return Math.round(this.averageRating());
  }

  getSelectedColorName(): string {
    return this.product()?.colors?.find(
      (c: any) => c.id === this.selectedColorId()
    )?.name ?? '';
  }

  isLightColor(hex: string): boolean {
    if (!hex || hex.length < 7) return true;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  }

  increaseQty(): void { this.changeQuantity(1); }
  decreaseQty(): void { this.changeQuantity(-1); }


  // ── بيانات مشتقة ──
  isAdmin = computed(() => this.authService.role() === 'admin');

  /** بيانات المتجر — من product.shop (المسار العام) أو product._shop (مُضافة من المتاجر) */
  shop = computed(() => {
    const p = this.product();
    if (!p) return null;
    // المنتجات المُجلبة من /store/shops/{id}/products لا تحتوي على shop
    // لذا نُرفق _shop يدوياً عند الجلب في products-list
    const s = p.shop ?? p._shop;
    if (!s) return null;
    return {
      ...s,
      socialLinks: s.social_links ?? s.socialLinks ?? {}
    };
  });

  /** آخر 5 تقييمات — من product.latest_reviews */
  reviews = computed(() => {
    const p = this.product();
    if (!p) return [];
    return (p.latest_reviews ?? p.reviews ?? []).map((r: any) => ({
      ...r,
      buyerName: r.buyer?.full_name ?? r.buyerName ?? 'مجهول',
      date: r.created_at ?? r.date ?? '',
      verified: r.verified ?? true
    }));
  });

  /** منتجات مشابهة بالذكاء الاصطناعي — تُجلب من GET /recommendations/products/{id}/similar */
  similarProducts = signal<any[]>([]);
  isLoadingSimilar = signal(false);

  /** هل المنتج في السلة؟ — نتحقق من CartService */
  isInCart = computed(() => {
    const p = this.product();
    if (!p) return false;
    return this.cartService.shops().some(shop =>
      shop.items.some(item => item.product_id === String(p.id))
    );
  });

  primaryImage = computed(() => {
    const p = this.product();
    if (!p) return null;
    if (p.primary_image?.image_url) return p.primary_image.image_url;
    const colors = p.colors ?? [];
    const defaultColor = colors.find((c: any) => c.id === p.default_color_id) ?? colors[0];
    if (defaultColor?.images?.length) return defaultColor.images[0].image_url;
    if (p.general_images?.length) return p.general_images[0].image_url;
    return null;
  });

  colorImages = computed(() => {
    const p = this.product();
    if (!p || !this.selectedColorId()) return [];
    const color = (p.colors ?? []).find((c: any) => c.id === this.selectedColorId());
    return color?.images ?? [];
  });

  /** صور الدرجة المختارة */
  shadeImages = computed(() => {
    const p = this.product();
    if (!p || !this.selectedShadeId()) return [];
    const shade = (p.shades ?? []).find((s: any) => s.id === this.selectedShadeId());
    return shade?.images ?? [];
  });

  /** الصور المعروضة حسب الـ variant المختار */
  displayImages = computed(() => {
    if (this.selectedShadeId() && this.shadeImages().length) return this.shadeImages();
    if (this.selectedColorId() && this.colorImages().length) return this.colorImages();
    return [];
  });

  /** هل يجب إلزام اختيار درجة قبل الإضافة للسلة؟ */
  requiresShade = computed(() => {
    const p = this.product();
    return (p?.shades?.length ?? 0) > 0;
  });

  isProductDisabled = computed(() => {
    const p = this.product();
    if (!p) return false;
    return p.status === 'unpublished' || p.is_active === false;
  });

  /** هل زر الإضافة للسلة معطّل؟ */
  isAddToCartDisabled = computed(() => {
    if (this.isAddingToCart()) return true;
    if (this.authService.isBanned()) return true;
    if (this.isProductDisabled()) return true;
    if (this.requiresShade() && !this.selectedShadeId()) return true;
    return false;
  });


  averageRating = computed(() => {
    const p = this.product();
    return +(p?.rating?.average ?? p?.average_rating ?? 0);
  });

  reviewCount = computed(() => {
    const p = this.product();
    return p?.rating?.count ?? p?.reviews_count ?? 0;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(paramMap => {
      const slugOrId   = paramMap.get('id') ?? '';
      const merchantId = this.route.snapshot.queryParamMap.get('mid') ?? '';

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      const current = this.product();
      if (current && (current.slug === slugOrId || String(current.id) === slugOrId)) {
        return;
      }

      // 1. استخراج المنتج من navigation state (متاح دائماً أثناء تنفيذ paramMap.subscribe)
      const stateProduct =
        (typeof window !== 'undefined' ? (window.history.state as any)?.product : null) ??
        this.router.getCurrentNavigation()?.extras?.state?.['product'] ??
        null;

      // 2. التحقق من الكاش السريع في ProductService
      const cachedProduct = slugOrId ? this.productService.getCachedProduct(slugOrId) : null;

      const navMatches = stateProduct && (
        stateProduct.slug === slugOrId ||
        String(stateProduct.id) === slugOrId ||
        !slugOrId
      );

      const initialData = navMatches ? stateProduct : cachedProduct;

      if (initialData) {
        // نستخدم بيانات المنتج المتاحة فوراً بدون أي تأخير وبدون شاشة تحميل
        const p = this.normalizeProductData(initialData);
        this.product.set(p);
        this.productService.cacheProduct(p);
        const defaultColorId = p.default_color_id;
        if (defaultColorId) {
          this.selectedColorId.set(defaultColorId);
        } else if (p.colors?.length) {
          const first = p.colors.find((c: any) => c.images?.length > 0);
          this.selectedColorId.set(first ? first.id : p.colors[0].id);
        }
        if (p.sizes?.length) this.selectedSizeId.set(p.sizes[0].id);
        this.isLoading.set(false);
        this.error.set('');
        if (this.authService.isLoggedIn()) this.loadUserReviewStatus();
        this.loadReviewsList(1);
        if (p.id) this.loadSimilarProducts(p.id);

        // جلب التفاصيل الإضافية وتحديث الصفحة في الخلفية دون حجب المحتوى
        this.loadProduct(slugOrId, merchantId, true);
      } else {
        // وصول مباشر عبر الرابط بدون كاش مسبق — تحميل اعتيادي
        this.loadProduct(slugOrId, merchantId, false);
      }
    });
  }

  private initReviews(): void {
    if (this.authService.isLoggedIn()) {
      this.loadUserReviewStatus();
    }
    this.loadReviewsList(1);
    const id = this.product()?.id;
    if (id) this.loadSimilarProducts(id);
  }

  loadSimilarProducts(productId: string | number): void {
    this.isLoadingSimilar.set(true);
    this.aiService.getSimilarProducts(productId).subscribe({
      next: (res: any) => {
        // فحص كل عنصر بحثاً عن debug_error
        const validProducts = (res.data ?? []).filter(
          (item: any) => !item.debug_error && item.id && String(item.id) !== String(productId)
        );
        this.similarProducts.set(validProducts);
        this.productService.cacheProducts(validProducts);
        this.isLoadingSimilar.set(false);
      },
      error: () => {
        // فشل صامت — لا توقف صفحة المنتج
        this.isLoadingSimilar.set(false);
      }
    });
  }

  goToSimilarProduct(slugOrId: number | string, prod?: any): void {
    const found = prod ?? this.similarProducts().find(p =>
      (p.slug && p.slug === slugOrId) || p.id === slugOrId
    );
    if (found) {
      this.productService.cacheProduct(found);
    }
    const target = found?.slug || slugOrId;
    this.router.navigate(['/products', target], {
      state: { product: found ?? null }
    });
  }

  loadProduct(slug: string, merchantId: string = '', isBackground: boolean = false): void {
    if (!slug) {
      if (!this.product()) {
        this.error.set('مسار المنتج غير صالح');
      }
      this.isLoading.set(false);
      return;
    }

    if (!isBackground) {
      this.isLoading.set(true);
      this.error.set('');
    }

    const isMerchant = this.authService.role() === 'merchant';

    if (isMerchant && merchantId) {
      // GET /store/products/{id} — يرجع حتى المسودات (draft) للتاجر
      this.productService.getProduct(merchantId).subscribe({
        next: (res) => {
          const data = this.normalizeProductData((res as any).data ?? res);
          this.productService.cacheProduct(data);
          if (this.product()) {
            this.product.update(cur => ({ ...cur, ...data }));
          } else {
            this.product.set(data);
          }
          const defaultColorId = data.default_color_id;
          if (defaultColorId && !this.selectedColorId()) {
            this.selectedColorId.set(defaultColorId);
          } else if (data.colors?.length && !this.selectedColorId()) {
            const firstWithImages = data.colors.find((c: any) => c.images?.length > 0);
            this.selectedColorId.set(firstWithImages ? firstWithImages.id : data.colors[0].id);
          }
          if (data.sizes?.length && !this.selectedSizeId()) {
            this.selectedSizeId.set(data.sizes[0].id);
          }
          this.isLoading.set(false);
          this.initReviews();
        },
        error: () => {
          if (!this.product()) {
            this.error.set('المنتج غير متاح أو غير موجود');
          }
          this.isLoading.set(false);
        }
      });
    } else {
      // جلب عام للمنتج مع دعم الـ slug والـ UUID
      this.productService.getProductByUuidOrSlug(slug).subscribe({
        next: (res) => {
          const raw = res?.data ?? res;
          if (!raw || res?.status === 'error' || (!raw.id && !raw.title && !raw.name)) {
            // محاولة إضافية للتاجر
            if (isMerchant && slug) {
              this.productService.getProduct(slug).subscribe({
                next: (mRes) => {
                  const data = this.normalizeProductData((mRes as any).data ?? mRes);
                  this.productService.cacheProduct(data);
                  if (this.product()) {
                    this.product.update(cur => ({ ...cur, ...data }));
                  } else {
                    this.product.set(data);
                  }
                  if (data.colors?.length && !this.selectedColorId()) this.selectedColorId.set(data.colors[0].id);
                  if (data.sizes?.length && !this.selectedSizeId()) this.selectedSizeId.set(data.sizes[0].id);
                  this.isLoading.set(false);
                  this.initReviews();
                },
                error: () => {
                  if (!this.product()) {
                    this.error.set('المنتج غير متاح أو غير موجود');
                  }
                  this.isLoading.set(false);
                }
              });
              return;
            }
            if (!this.product()) {
              this.error.set('المنتج غير متاح أو غير موجود');
            }
            this.isLoading.set(false);
            return;
          }

          const data = this.normalizeProductData(raw);
          this.productService.cacheProduct(data);
          if (this.product()) {
            this.product.update(cur => ({ ...cur, ...data }));
          } else {
            this.product.set(data);
          }
          const defaultColorId = data.default_color_id;
          if (defaultColorId && !this.selectedColorId()) {
            this.selectedColorId.set(defaultColorId);
          } else if (data.colors?.length && !this.selectedColorId()) {
            const firstWithImages = data.colors.find((c: any) => c.images?.length > 0);
            this.selectedColorId.set(firstWithImages ? firstWithImages.id : data.colors[0].id);
          }
          if (data.sizes?.length && !this.selectedSizeId()) {
            this.selectedSizeId.set(data.sizes[0].id);
          }
          this.isLoading.set(false);
          this.initReviews();
        },
        error: () => {
          // إذا فشل الجلب العام للمنتج وكان المستخدم تاجر، نحاول جلبه كـ UUID من راوت التاجر
          if (isMerchant && slug) {
            this.productService.getProduct(slug).subscribe({
              next: (res) => {
                const data = this.normalizeProductData((res as any).data ?? res);
                this.productService.cacheProduct(data);
                if (this.product()) {
                  this.product.update(cur => ({ ...cur, ...data }));
                } else {
                  this.product.set(data);
                }
                if (data.colors?.length && !this.selectedColorId()) this.selectedColorId.set(data.colors[0].id);
                if (data.sizes?.length && !this.selectedSizeId()) this.selectedSizeId.set(data.sizes[0].id);
                this.isLoading.set(false);
                this.initReviews();
              },
              error: () => {
                if (!this.product()) {
                  this.error.set('المنتج غير متاح أو غير موجود');
                }
                this.isLoading.set(false);
              }
            });
            return;
          }
          if (!this.product()) {
            this.error.set('المنتج غير متاح أو غير موجود');
          }
          this.isLoading.set(false);
        }
      });
    }
  }

  selectColor(colorId: string): void {
    this.selectedColorId.set(colorId);
    // عند اختيار لون يُلغى اختيار الدرجة ويعاد تعيين الصورة النشطة
    this.selectedShadeId.set('');
    this.variantMode.set('color');
    this.activeImage.set('');
  }

  selectShade(shadeId: string): void {
    this.selectedShadeId.set(shadeId);
    // عند اختيار درجة يُلغى اختيار اللون ويعاد تعيين الصورة النشطة
    this.selectedColorId.set('');
    this.variantMode.set('shade');
    this.activeImage.set('');
  }


  selectSize(sizeId: string): void {
    this.selectedSizeId.set(sizeId);
  }

  changeQuantity(delta: number): void {
    if (this.isAdmin()) return;
    const stock = this.product()?.stock ?? 1;
    const next = this.quantity() + delta;
    if (next >= 1 && next <= stock) {
      this.quantity.set(next);
    }
  }

  addToCart(): void {
    if (this.isAdmin()) return;
    if (this.authService.isBanned()) {
      alert('حسابك موقوف من قِبل إدارة المنصة ولا يمكنك إجراء عمليات الشراء.');
      return;
    }
    if (!this.authService.isLoggedIn()) {
      this.showLoginPrompt.set(true);
      return;
    }

    const p = this.product();
    if (!p) return;

    if (p.status === 'unpublished' || p.is_active === false) {
      alert('هذا المنتج غير متاح حالياً أو تم إيقافه من قِبل إدارة المنصة.');
      return;
    }

    // منع اختيار لون ودرجة معاً (تحقق دفاعي)
    if (this.selectedColorId() && this.selectedShadeId()) {
      alert('لا يمكن اختيار لون ودرجة في نفس الوقت');
      return;
    }

    this.isAddingToCart.set(true);

    const payload: any = {
      product_id: String(p.id),
      quantity: this.quantity(),
    };
    if (this.selectedShadeId()) {
      payload['shade_id'] = this.selectedShadeId();
    } else if (this.selectedColorId()) {
      payload['color_id'] = this.selectedColorId();
    }
    if (this.selectedSizeId()) payload['size_id'] = this.selectedSizeId();

    this.cartService.addItem(payload).subscribe({
      next: () => this.isAddingToCart.set(false),
      error: (err) => {
        this.isAddingToCart.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        const msg = err?.error?.message ?? err?.error?.error ?? 'فشل إضافة المنتج للسلة';
        alert(msg);
      }
    });
  }


  toggleWishlist(productId?: number | string): void {
    if (this.isAdmin()) return;
    if (this.authService.isBanned()) {
      return;
    }
    if (!this.authService.isLoggedIn()) {
      this.showLoginPrompt.set(true);
      return;
    }

    const id = productId ?? this.product()?.id;
    if (!id) return;

    this.isTogglingWishlist.set(true);
    this.buyerService.toggleWishlist(String(id)).subscribe({
      next: (res) => {
        if (!productId || productId === this.product()?.id) {
          this.isInWishlist.set(res.action === 'added');
        }
        this.isTogglingWishlist.set(false);
      },
      error: (err) => {
        this.isTogglingWishlist.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        const msg = err?.error?.message ?? err?.error?.error ?? 'فشل تحديث المفضلة';
        alert(msg);
      }
    });
  }

  goToShop(): void {
    const s = this.shop(); // يستخدم _shop كـ fallback تلقائياً
    // نستخدم الـ id (UUID) لأن /store/shops/{id} لا يقبل الـ slug
    const shopId = s?.id;
    if (shopId) this.router.navigate(['/stores', shopId]);
  }

  goToProduct(slug: string | number): void {
    this.router.navigate(['/products', slug]);
  }

  closeLoginPrompt(): void {
    this.showLoginPrompt.set(false);
  }

  getCategoryName(categoryId: string | number | undefined): string {
    if (!categoryId) return '';
    const p = this.product();
    return p?.category?.name ?? '';
  }

  getStars(): number[] {
    return [1, 2, 3, 4, 5];
  }

  formatPrice(price: string | number): string {
    return (+price).toLocaleString('ar-LY') + ' د.ل';
  }

  // ════════════════════════════════════════════════════
  // ── قسم التقييمات والتعليقات ──
  // ════════════════════════════════════════════════════

  userReviewStatus      = signal<any>(null);
  isLoadingReviewStatus = signal(false);
  reviewsTab            = signal<'rates' | 'comments'>('rates');
  reviewsList           = signal<any[]>([]);
  reviewsSummary        = signal<any>(null);
  reviewsCurrentPage    = signal(1);
  reviewsLastPage       = signal(1);
  isLoadingReviews      = signal(false);
  selectedRatingValue   = signal(0);
  commentText           = signal('');
  isSubmittingRate      = signal(false);
  isSubmittingComment   = signal(false);
  isDeletingComment     = signal(false);
  reviewActionError     = signal<string | null>(null);
  showDeleteCommentConfirm = signal(false);

  loadUserReviewStatus(): void {
    const id = this.product()?.id;
    if (!id) return;
    this.isLoadingReviewStatus.set(true);
    this.orderService.getUserReviewStatus(String(id)).subscribe({
      next: (res) => {
        this.userReviewStatus.set(res);
        if (res.review) {
          this.selectedRatingValue.set(res.review.rating ?? 0);
          this.commentText.set(res.review.comment ?? '');
        }
        this.isLoadingReviewStatus.set(false);
      },
      error: () => this.isLoadingReviewStatus.set(false)
    });
  }

  loadReviewsList(page: number = 1): void {
    const id = this.product()?.id;
    if (!id) return;
    this.isLoadingReviews.set(true);
    const call = this.reviewsTab() === 'rates'
      ? this.orderService.getProductRates(String(id), page)
      : this.orderService.getProductComments(String(id), page);
    call.subscribe({
      next: (res) => {
        this.reviewsList.set(res.data ?? []);
        this.reviewsCurrentPage.set(res.meta?.current_page ?? 1);
        this.reviewsLastPage.set(res.meta?.last_page ?? 1);
        if (res.summary) this.reviewsSummary.set(res.summary);
        this.isLoadingReviews.set(false);
      },
      error: () => this.isLoadingReviews.set(false)
    });
  }

  switchReviewsTab(tab: 'rates' | 'comments'): void {
    this.reviewsTab.set(tab);
    this.loadReviewsList(1);
  }

  setRating(value: number): void {
    this.selectedRatingValue.set(value);
  }

  submitRate(): void {
    const id = this.product()?.id;
    if (!id || this.selectedRatingValue() === 0) return;
    this.isSubmittingRate.set(true);
    this.reviewActionError.set(null);
    this.orderService.rateProduct(String(id), this.selectedRatingValue()).subscribe({
      next: () => {
        this.isSubmittingRate.set(false);
        this.loadUserReviewStatus();
        this.loadReviewsList(this.reviewsCurrentPage());
      },
      error: (err) => this.handleReviewError(err)
    });
  }

  submitComment(): void {
    const id = this.product()?.id;
    const text = this.commentText().trim();
    if (!id) return;
    if (!text) {
      this.doPostComment(id, null);
      return;
    }

    this.isSubmittingComment.set(true);
    this.reviewActionError.set(null);

    // فحص المحتوى بالذكاء الاصطناعي استشارياً (Trap 10 & 11)
    this.aiService.checkComment(text).subscribe({
      next: (checkResult) => {
        if (!checkResult.allowed) {
          this.isSubmittingComment.set(false);
          this.reviewActionError.set(checkResult.reason || 'عذراً، يحتوي التعليق على عبارات غير ملائمة.');
          return;
        }
        this.doPostComment(id, text);
      },
      error: () => {
        // فشل فحص الذكاء الاصطناعي -> fail open والمتابعة
        this.doPostComment(id, text);
      }
    });
  }

  private doPostComment(id: string | number, text: string | null): void {
    this.orderService.postComment(String(id), text).subscribe({
      next: () => {
        this.isSubmittingComment.set(false);
        this.loadUserReviewStatus();
        this.loadReviewsList(this.reviewsCurrentPage());
      },
      error: (err) => this.handleReviewError(err)
    });
  }

  confirmDeleteComment(): void {
    const id = this.product()?.id;
    if (!id) return;
    this.isDeletingComment.set(true);
    this.orderService.deleteComment(String(id)).subscribe({
      next: () => {
        this.isDeletingComment.set(false);
        this.showDeleteCommentConfirm.set(false);
        this.commentText.set('');
        // ⚠ لا تعتمد على data من الاستجابة — حدّث محلياً كما يفرضه التوثيق
        this.userReviewStatus.update(s => s
          ? { ...s, has_commented: false,
              review: s.review ? { ...s.review, comment: null } : null }
          : s);
        this.loadReviewsList(this.reviewsCurrentPage());
      },
      error: () => this.isDeletingComment.set(false)
    });
  }

  private handleReviewError(err: any): void {
    this.isSubmittingRate.set(false);
    this.isSubmittingComment.set(false);
    const status = err?.status;
    if (status === 403) {
      this.reviewActionError.set(err?.error?.error ?? 'غير مصرح بهذا الإجراء');
    } else if (status === 422) {
      const msg = err?.error?.errors
        ? Object.values(err.error.errors).flat().join(' ')
        : (err?.error?.error ?? 'بيانات غير صالحة');
      this.reviewActionError.set(msg as string);
    } else {
      this.reviewActionError.set('حدث خطأ غير متوقع');
    }
  }

  goToReviewsPage(page: number): void {
    if (page < 1 || page > this.reviewsLastPage()) return;
    this.loadReviewsList(page);
  }

  // ── Report Product ──
  showReportProductDialog = signal(false);
  reportProductReason     = signal('');
  isSubmittingProductReport = signal(false);
  reportProductMsg        = signal('');

  openReportProduct(): void {
    if (!this.authService.isLoggedIn()) {
      this.showLoginPrompt.set(true);
      return;
    }
    this.showReportProductDialog.set(true);
  }

  submitProductReport(): void {
    const p = this.product();
    if (!p?.id || !this.reportProductReason().trim()) return;
    this.isSubmittingProductReport.set(true);
    this.buyerService.submitReport('product', String(p.id), this.reportProductReason()).subscribe({
      next: () => {
        this.isSubmittingProductReport.set(false);
        this.showReportProductDialog.set(false);
        this.reportProductReason.set('');
        this.reportProductMsg.set('✓ تم إرسال البلاغ بنجاح');
        setTimeout(() => this.reportProductMsg.set(''), 4000);
      },
      error: () => {
        this.isSubmittingProductReport.set(false);
        this.reportProductMsg.set('حدث خطأ أثناء إرسال البلاغ');
        setTimeout(() => this.reportProductMsg.set(''), 3000);
      }
    });
  }
}
