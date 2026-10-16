import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService, Product } from '../../core/services/product.service';
import { AiService } from '../../core/services/ai.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-products',
  imports: [CommonModule, ConfirmDialogComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  private productService = inject(ProductService);
  private aiService      = inject(AiService);
  public router = inject(Router);

  isLoading = signal(true);
  error = signal('');
  activeTab = signal('all');
  products = signal<Product[]>([]);
  stats = signal({ all: 0, out_of_stock: 0, low_stock: 0, draft: 0 });
  deletingId = signal<string | null>(null);
  productToDelete = signal<Product | null>(null);
  productToRemoveIndex = signal<Product | null>(null);
  togglingId = signal<string | null>(null);
  generatingEmbeddingId = signal<string | null>(null);
  removingIndexId = signal<string | null>(null);
  embeddingProductId = signal<string | null>(null);
  embeddingStatus = signal<'idle' | 'processing' | 'done'>('idle');

  // Status Modal State
  statusModalProduct = signal<Product | null>(null);
  isChangingStatus = signal(false);
  modalError = signal('');
  toastMessage = signal('');
  private toastTimer: any = null;

  showTrash = signal(false);
  trashedProducts = signal<any[]>([]);
  isLoadingTrash = signal(false);
  isRestoringId = signal<string | null>(null);

  isDragging = signal(false);
  draggedProductId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.productService.getProducts(this.activeTab()).subscribe({
      next: (res) => {
        this.products.set(res.data.products.data);
        this.stats.set(res.data.stats);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('فشل تحميل المنتجات');
        this.isLoading.set(false);
      }
    });
  }

  changeTab(tab: string): void {
    this.activeTab.set(tab);
    this.loadProducts();
  }

  openStatusModal(product: Product): void {
    this.statusModalProduct.set(product);
    this.modalError.set('');
  }

  closeStatusModal(): void {
    if (this.isChangingStatus()) return;
    this.statusModalProduct.set(null);
    this.modalError.set('');
  }

  confirmStatusChange(): void {
    const product = this.statusModalProduct();
    if (!product) return;

    this.isChangingStatus.set(true);
    this.modalError.set('');

    const targetIsActive = !product.is_active;

    this.productService.togglePublish(product.id).subscribe({
      next: (res) => {
        this.isChangingStatus.set(false);
        this.statusModalProduct.set(null);
        const successText = res?.message || (targetIsActive 
          ? `تم نشر المنتج "${product.title}" وتفعيله بنجاح في المتجر.` 
          : `تم إلغاء نشر المنتج "${product.title}" وتحويله إلى مسودة بنجاح.`);
        this.showToast(successText);
        this.loadProducts();
      },
      error: (err) => {
        this.isChangingStatus.set(false);
        const errMsg = err?.error?.message || 'تعذر تغيير حالة المنتج. يرجى التأكد من توفر صورة للمنتج أولاً.';
        this.modalError.set(errMsg);
      }
    });
  }

  showToast(msg: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage.set(msg);
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set('');
    }, 4500);
  }

  togglePublish(product: Product): void {
    this.openStatusModal(product);
  }

  askDeleteProduct(product: Product): void {
    this.productToDelete.set(product);
  }

  doDeleteProduct(): void {
    const prod = this.productToDelete();
    if (!prod) return;
    this.deletingId.set(prod.id);
    this.productService.deleteProduct(prod.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.productToDelete.set(null);
        this.loadProducts();
      },
      error: () => {
        this.deletingId.set(null);
        this.productToDelete.set(null);
      }
    });
  }

  viewProduct(product: any): void {
    // نمرر product.id كـ query param لأن /seller/products/{id} يقبل UUID فقط لا slug
    this.router.navigate(['/products', product.slug ?? product.id], {
      queryParams: { mid: product.id }
    });
  }

  editProduct(id: string): void {
    this.router.navigate(['/merchant/products/edit', id]);
  }

  generateEmbedding(productOrId: string | Product): void {
    const productId = typeof productOrId === 'string' ? productOrId : productOrId?.id;
    if (!productId) return;

    this.embeddingProductId.set(productId);
    this.generatingEmbeddingId.set(productId);
    this.embeddingStatus.set('processing');

    this.aiService.generateProductEmbedding(productId).subscribe({
      next: (res) => {
        if (res.success) {
          // ⚠️ فخ 6: الرد فوري لكن التوليد في الخلفية
          // اعرض "قيد المعالجة" لا "تم التحديث"
          this.embeddingStatus.set('processing');
          this.showToast('جارٍ تحديث فهرس البحث للمنتج — قيد المعالجة...');
          setTimeout(() => {
            this.embeddingProductId.set(null);
            this.generatingEmbeddingId.set(null);
            this.embeddingStatus.set('idle');
          }, 3000);
        } else {
          this.embeddingProductId.set(null);
          this.generatingEmbeddingId.set(null);
          this.embeddingStatus.set('idle');
          this.showToast(res.message || 'تعذر تحديث فهرس البحث حالياً.');
        }
      },
      error: (err) => {
        this.embeddingProductId.set(null);
        this.generatingEmbeddingId.set(null);
        this.embeddingStatus.set('idle');
        this.showToast(err?.message || 'تعذر تحديث فهرس البحث حالياً.');
      }
    });
  }

  askRemoveFromIndex(product: Product): void {
    this.productToRemoveIndex.set(product);
  }

  doRemoveFromIndex(): void {
    const prod = this.productToRemoveIndex();
    if (!prod) return;
    this.removingIndexId.set(prod.id);
    this.aiService.removeProductFromSearchIndex(prod.id).subscribe({
      next: (res) => {
        this.removingIndexId.set(null);
        this.productToRemoveIndex.set(null);
        this.showToast(res.message || 'تمت إزالة المنتج من فهرس البحث بنجاح.');
      },
      error: (err) => {
        this.removingIndexId.set(null);
        this.productToRemoveIndex.set(null);
        this.showToast(err.message || 'تعذر إزالة المنتج من الفهرس حالياً.');
      }
    });
  }

  createNew(): void {
    this.router.navigate(['/merchant/products/create']);
  }

  getProductThumb(p: any): string {
    if (!p) return '';
    if (p.image) return p.image;
    if (p.image_url) return p.image_url;
    if (typeof p.primary_image === 'string') return p.primary_image;
    if (p.primary_image?.image_url) return p.primary_image.image_url;
    if (p.primary_image?.url) return p.primary_image.url;
    if (p.general_images?.length) return p.general_images[0]?.image_url ?? p.general_images[0]?.url ?? '';
    if (p.grouped_images?.general?.length) return p.grouped_images.general[0]?.image_url ?? p.grouped_images.general[0]?.url ?? '';
    if (p.images?.length) return p.images[0]?.image_url ?? p.images[0]?.url ?? '';
    if (p.grouped_images) {
      for (const k of Object.keys(p.grouped_images)) {
        if (Array.isArray(p.grouped_images[k]) && p.grouped_images[k].length > 0) {
          return p.grouped_images[k][0]?.image_url ?? p.grouped_images[k][0]?.url ?? '';
        }
      }
    }
    return '';
  }

  formatPrice(price: number): string {
    return price.toLocaleString('ar-LY') + ' د.ل';
  }

  toggleTrash(): void {
    this.showTrash.update(v => !v);
    if (this.showTrash() && this.trashedProducts().length === 0) {
      this.loadTrash();
    }
  }

  loadTrash(): void {
    this.isLoadingTrash.set(true);
    this.productService.getTrashedProducts().subscribe({
      next: (res) => {
        this.trashedProducts.set(res.data ?? []);
        this.isLoadingTrash.set(false);
      },
      error: () => this.isLoadingTrash.set(false)
    });
  }

  restoreProduct(id: string): void {
    this.isRestoringId.set(id);
    this.productService.restoreProduct(id).subscribe({
      next: () => {
        this.isRestoringId.set(null);
        this.trashedProducts.update(list => list.filter(p => p.id !== id));
        this.loadProducts();  // تحديث القائمة الأساسية
      },
      error: () => this.isRestoringId.set(null)
    });
  }

  onDragStart(productId: string): void {
    this.draggedProductId.set(productId);
  }

  onDrop(targetProductId: string): void {
    const draggedId = this.draggedProductId();
    if (!draggedId || draggedId === targetProductId) return;

    const list = [...this.products()];
    const draggedIndex = list.findIndex(p => p.id === draggedId);
    const targetIndex = list.findIndex(p => p.id === targetProductId);
    const [moved] = list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, moved);
    this.products.set(list);

    this.productService.moveProduct(draggedId, targetIndex).subscribe({
      error: () => this.loadProducts()  // استرجاع الترتيب الأصلي عند الفشل
    });
    this.draggedProductId.set(null);
  }
}
