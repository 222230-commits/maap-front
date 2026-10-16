import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService, CartShop, CartItem } from '../../core/services/cart.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-cart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ConfirmDialogComponent],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss'
})
export class CartComponent implements OnInit {
  private cartService = inject(CartService);
  public router = inject(Router);

  // ── قراءة من CartService signals ──
  readonly shops = this.cartService.shops;
  readonly totalItems = this.cartService.totalItems;
  readonly grandTotal = this.cartService.grandTotal;
  readonly isEmpty = this.cartService.isEmpty;

  // ── حالة محلية ──
  isLoading = signal(true);
  error = signal('');
  updatingId = signal<string | null>(null);
  removingId = signal<string | null>(null);
  isClearing = signal(false);

  // ── نوافذ التأكيد ──
  showClearModal = signal(false);
  itemToDelete = signal<{ id: string; title: string } | null>(null);

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.cartService.loadCart().subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.error.set('فشل تحميل السلة. تحقق من اتصالك وحاول مجدداً.');
        this.isLoading.set(false);
      }
    });
  }

  decreaseQty(item: CartItem): void {
    if (this.updatingId()) return;
    if (item.quantity <= 1) {
      this.removeItem(item.cart_item_id);
    } else {
      this.updatingId.set(item.cart_item_id);
      this.cartService.updateCartItem(item.cart_item_id, item.quantity - 1).subscribe({
        next: () => {
          this.updatingId.set(null);
          this.loadCart();
        },
        error: (err) => {
          this.updatingId.set(null);
          alert(err?.error?.error ?? 'فشل تحديث الكمية');
        }
      });
    }
  }

  increaseQty(item: CartItem): void {
    if (this.updatingId()) return;
    if (item.quantity >= item.stock) return;
    this.updatingId.set(item.cart_item_id);
    this.cartService.updateCartItem(item.cart_item_id, item.quantity + 1).subscribe({
      next: () => {
        this.updatingId.set(null);
        this.loadCart();
      },
      error: (err) => {
        this.updatingId.set(null);
        alert(err?.error?.error ?? 'فشل تحديث الكمية');
      }
    });
  }

  removeItem(cartItemId: string): void {
    if (this.removingId()) return;
    this.removingId.set(cartItemId);
    this.cartService.removeCartItem(cartItemId).subscribe({
      next: () => {
        this.removingId.set(null);
        this.itemToDelete.set(null);
        this.loadCart();
      },
      error: () => {
        this.removingId.set(null);
        this.itemToDelete.set(null);
        this.loadCart();
      }
    });
  }

  updateQuantity(item: CartItem, newQty: number): void {
    if (newQty > item.quantity) {
      this.increaseQty(item);
    } else {
      this.decreaseQty(item);
    }
  }

  askRemoveItem(item: CartItem): void {
    this.itemToDelete.set({ id: item.cart_item_id, title: item.title });
  }

  doRemoveItem(): void {
    const target = this.itemToDelete();
    if (!target) return;
    this.removeItem(target.id);
  }

  askClearCart(): void {
    this.showClearModal.set(true);
  }

  doClearCart(): void {
    this.isClearing.set(true);
    this.cartService.clearCart().subscribe({
      next: () => {
        this.isClearing.set(false);
        this.showClearModal.set(false);
      },
      error: () => {
        this.isClearing.set(false);
        this.showClearModal.set(false);
      }
    });
  }

  hasUnavailableItems(shop: CartShop): boolean {
    return this.cartService.hasUnavailableItems(shop);
  }

  formatPrice(value: number): string {
    return value.toLocaleString('ar-LY') + ' د.ل';
  }
}
