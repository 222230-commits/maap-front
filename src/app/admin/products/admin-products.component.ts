import { Component, computed, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '@core/services/admin.service';
import { AiService } from '@core/services/ai.service';

@Component({
  selector: 'app-admin-products',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './admin-products.component.html',
  styleUrl: './admin-products.component.scss'
})
export class AdminProductsComponent implements OnInit {
  private adminService = inject(AdminService);
  private aiService    = inject(AiService);

  // ── State ──────────────────────────────────────────
  isLoading         = signal(true);
  error             = signal('');
  products          = signal<any[]>([]);
  categories        = signal<any[]>([]);
  searchQuery       = signal('');
  selectedCategory  = signal<string | null>(null);
  showDeleteConfirm = signal(false);
  productToDelete   = signal<string | null>(null);

  // ── AI Search Engine Sync State ────────────────────
  isSyncingSearchEngine = signal(false);
  syncResult = signal<{ status: 'dispatched' | 'empty' | 'error'; message: string; batch_id?: string | null } | null>(null);

  // فلترة محلية بعد جلب البيانات من API
  filteredProducts = computed(() => {
    let list = this.products();
    const cat = this.selectedCategory();
    const q   = this.searchQuery().trim().toLowerCase();
    if (cat) {
      list = list.filter(p =>
        (p.category_id ?? p.categoryId) === cat ||
        (p.category?.id ?? p.category?.name)?.toString()
          .toLowerCase().includes(cat.toLowerCase())
      );
    }
    if (q) {
      list = list.filter(p =>
        (p.title ?? p.name ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.adminService.getAdminProducts().subscribe({
      next: (res) => {
        const raw = res.data?.data ?? res.data ?? res ?? [];
        this.products.set(Array.isArray(raw) ? raw : []);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('فشل تحميل المنتجات');
        this.isLoading.set(false);
      }
    });
  }

  loadCategories(): void {
    this.adminService.getCategories().subscribe({
      next: (res) => {
        const raw = res.data ?? res ?? [];
        this.categories.set(Array.isArray(raw) ? raw.map((c: any) => ({
          id:     c.id,
          nameAr: c.name_ar ?? c.nameAr ?? c.name ?? '',
          icon:   c.icon ?? 'fas fa-tag',
        })) : []);
      },
      error: () => {} // الفلتر اختياري — لا نعرض خطأ
    });
  }

  onSearch(v: string): void {
    this.searchQuery.set(v);
  }

  updateSearch(v: string): void { this.onSearch(v); }

  confirmDelete(id: string): void {
    this.productToDelete.set(id);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.productToDelete.set(null);
  }

  getCategoryName(product: any): string {
    return product.category?.name_ar
      ?? product.category?.name
      ?? product.category_name
      ?? '—';
  }

  getPrice(product: any): string {
    return (product.price ?? product.base_price ?? '—') + ' د.ل';
  }

  getDiscountPrice(product: any): string | null {
    const d = product.discount_price ?? product.discounted_price ?? product.discountPrice;
    return d ? d + ' د.ل' : null;
  }

  getShopName(product: any): string {
    return product.store_name ?? product.shop_name
      ?? product.store?.name ?? product.shopName ?? '—';
  }

  getProductName(product: any): string {
    return product.title ?? product.name ?? 'منتج';
  }

  syncSearchEngine(): void {
    if (this.isSyncingSearchEngine()) return;
    if (!confirm('هل تريد بدء مزامنة وتحديث جميع متجهات المنتجات النشطة مع محرك البحث الدلالي؟')) return;

    this.isSyncingSearchEngine.set(true);
    this.syncResult.set(null);

    this.aiService.syncSearchEngine().subscribe({
      next: (res) => {
        this.isSyncingSearchEngine.set(false);
        this.syncResult.set({
          status: res.status,
          message: res.message || 'تم إرسال مهمة مزامنة محرك البحث بنجاح',
          batch_id: res.batch_id
        });
      },
      error: (err) => {
        this.isSyncingSearchEngine.set(false);
        this.syncResult.set({
          status: 'error',
          message: err.message || 'فشلت عملية مزامنة محرك البحث الدلالي'
        });
      }
    });
  }

  dismissSyncResult(): void {
    this.syncResult.set(null);
  }
}
