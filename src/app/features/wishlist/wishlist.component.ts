import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { BuyerService, WishlistItem, WishlistPagination } from '../../core/services/buyer.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-wishlist',
  imports: [CommonModule, RouterModule, ConfirmDialogComponent],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.scss'
})
export class WishlistComponent implements OnInit {
  private buyerService = inject(BuyerService);
  public router = inject(Router);

  isLoading = signal(true);
  error = signal('');
  items = signal<WishlistItem[]>([]);
  removingId = signal<string | number | null>(null);
  isClearing = signal(false);
  showClearModal = signal(false);
  pagination = signal<WishlistPagination | null>(null);

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.isLoading.set(true);
    this.buyerService.getWishlist().subscribe({
      next: (res) => {
        // res.data مصفوفة مباشرة حسب الـ API الحقيقي
        this.items.set(res.data ?? []);
        this.pagination.set(res.pagination ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('فشل تحميل المفضلة');
        this.isLoading.set(false);
      }
    });
  }

  removeItem(id: string | number): void {
    this.removingId.set(id);
    this.buyerService.removeFromWishlist(String(id)).subscribe({
      next: () => {
        this.removingId.set(null);
        this.loadWishlist();
      },
      error: () => this.removingId.set(null)
    });
  }

  askClearAll(): void {
    this.showClearModal.set(true);
  }

  doClearAll(): void {
    this.isClearing.set(true);
    this.buyerService.clearWishlist().subscribe({
      next: () => {
        this.isClearing.set(false);
        this.showClearModal.set(false);
        this.items.set([]);
      },
      error: () => {
        this.isClearing.set(false);
        this.showClearModal.set(false);
      }
    });
  }

  formatPrice(price: string): string {
    return parseFloat(price).toLocaleString('ar-LY') + ' د.ل';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('ar-LY');
  }

  /** أول صورة متاحة للعنصر (primary أولاً، ثم أي صورة) */
  getItemImage(item: WishlistItem): string | null {
    if (!item.images?.length) return null;
    const primary = item.images.find(img => img.is_primary);
    return (primary ?? item.images[0]).image_url;
  }
}
