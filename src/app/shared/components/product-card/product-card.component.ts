import { Component, input, output, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private router      = inject(Router);

  isAdmin = computed(() => this.authService.role() === 'admin');

  product = input.required<any>();

  wishlistToggle = output<number | string>();
  productClick   = output<number | string>();
  loginRequired  = output<void>();

  // ── Quick Add Dialog ──
  showQuickAdd   = signal(false);
  selectedColor  = signal<string>('');
  selectedSize   = signal<string>('');
  addingToCart   = signal(false);
  addSuccess     = signal(false);

  /** هل المنتج في السلة؟ */
  isInCart = computed(() => {
    const p = this.product();
    if (!p) return false;
    const productId = String(p.id);
    return this.cartService.shops().some(shop =>
      shop.items.some(item => item.product_id === productId)
    );
  });

  /** ألوان المنتج من API */
  get productColors(): any[] {
    const p = this.product();
    return p?.colors ?? [];
  }

  /** مقاسات اللون المختار */
  get selectedColorSizes(): string[] {
    if (!this.selectedColor()) return [];
    const c = this.productColors.find(c => c.id == this.selectedColor() || c.color_name == this.selectedColor());
    return c?.sizes ?? [];
  }

  /** هل المنتج فيه ألوان/مقاسات؟ */
  get hasVariants(): boolean {
    return this.productColors.length > 0;
  }

  openQuickAdd(event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.loginRequired.emit();
      return;
    }
    if (!this.hasVariants) {
      // لا يوجد ألوان/مقاسات — أضف مباشرة
      this.directAddToCart();
      return;
    }
    this.selectedColor.set(this.productColors[0]?.id ?? '');
    this.selectedSize.set('');
    this.addSuccess.set(false);
    this.showQuickAdd.set(true);
  }

  closeQuickAdd(): void {
    this.showQuickAdd.set(false);
  }

  selectColor(colorId: string): void {
    this.selectedColor.set(colorId);
    this.selectedSize.set('');
  }

  selectSize(size: string): void {
    this.selectedSize.set(size);
  }

  confirmAddToCart(): void {
    const p = this.product();
    if (this.addingToCart()) return;
    this.addingToCart.set(true);

    const payload: any = { product_id: String(p.id), quantity: 1 };
    if (this.selectedColor()) payload['color_id'] = this.selectedColor();
    if (this.selectedSize())  payload['size']     = this.selectedSize();

    this.cartService.addItem(payload).subscribe({
      next: () => {
        this.addingToCart.set(false);
        this.addSuccess.set(true);
        setTimeout(() => this.closeQuickAdd(), 1200);
      },
      error: () => this.addingToCart.set(false)
    });
  }

  private directAddToCart(): void {
    const p = this.product();
    this.cartService.addItem({
      product_id: String(p.id),
      quantity: 1
    }).subscribe();
  }

  addToCart(event: Event): void {
    event.stopPropagation();
    this.openQuickAdd(event);
  }

  onWishlistClick(event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.loginRequired.emit();
      return;
    }
    this.wishlistToggle.emit(this.product().id);
  }

  onProductClick(): void {
    const p    = this.product();
    const slug = p.slug ?? p.id;
    if (this.authService.role() === 'merchant' && p.id) {
      this.router.navigate(['/products', slug], { queryParams: { mid: p.id } });
    } else {
      this.productClick.emit(slug);
    }
  }

  getStars(): number[] { return [1, 2, 3, 4, 5]; }

  get displayName(): string {
    const p = this.product();
    return p.title ?? p.name ?? '';
  }

  get displayImage(): string {
    const p = this.product();
    if (!p) return '';
    if (p.image) return p.image;
    if (p.image_url) return p.image_url;
    if (typeof p.primary_image === 'string') return p.primary_image;
    if (p.primary_image?.image_url) return p.primary_image.image_url;
    if (p.primary_image?.url) return p.primary_image.url;

    if (p.images?.length) {
      const primary = p.images.find((img: any) => img.is_primary);
      return (primary ?? p.images[0])?.image_url ?? (primary ?? p.images[0])?.url ?? '';
    }
    if (p.general_images?.length) {
      return p.general_images[0]?.image_url ?? p.general_images[0]?.url ?? '';
    }
    if (p.grouped_images) {
      if (p.grouped_images.general?.length) {
        return p.grouped_images.general[0]?.image_url ?? p.grouped_images.general[0]?.url ?? '';
      }
      for (const k of Object.keys(p.grouped_images)) {
        if (Array.isArray(p.grouped_images[k]) && p.grouped_images[k].length > 0) {
          return p.grouped_images[k][0]?.image_url ?? p.grouped_images[k][0]?.url ?? '';
        }
      }
    }
    // Try first color image
    if (p.colors?.length && p.colors[0]?.images?.length) {
      return p.colors[0].images[0]?.image_url ?? p.colors[0].images[0]?.url ?? '';
    }
    return '';
  }

  get displayPrice(): number {
    const p = this.product();
    return +(p.discountPrice ?? p.compare_at_price ?? p.price ?? 0);
  }

  get originalPrice(): number {
    return +(this.product().price ?? 0);
  }

  get hasDiscount(): boolean {
    const p = this.product();
    return !!(p.discountPrice || p.compare_at_price);
  }

  get discountPercent(): number {
    if (!this.hasDiscount) return 0;
    const orig = this.originalPrice;
    const current = this.displayPrice;
    if (!orig || orig <= current) return 0;
    return Math.round((orig - current) / orig * 100);
  }

  get displayRating(): number {
    const p = this.product();
    return +(p.rating ?? p.average_rating ?? 0);
  }

  get shopName(): string {
    const p = this.product();
    return p.shopName ?? p.shop_name ?? p.shop?.name ?? '';
  }

  get inWishlist(): boolean {
    return !!(this.product().inWishlist ?? this.product().is_favorited ?? false);
  }
}
