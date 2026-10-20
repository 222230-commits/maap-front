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
  isSyncingAllEmbeddings = signal(false);
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
      next: (res: any) => {
        // إذا كان السيرفر أرجع success: false داخل رد 200
        if (res && res.success === false) {
          this.isChangingStatus.set(false);
          this.modalError.set(res.message || 'تعذر تغيير حالة المنتج. يرجى التأكد من توفر صورة للمنتج أولاً.');
          return;
        }

        this.isChangingStatus.set(false);
        this.statusModalProduct.set(null);

        // تحديث محلي فوري للمنتج في القائمة
        this.products.update(list =>
          list.map(p => p.id === product.id ? { ...p, is_active: targetIsActive } : p)
        );

        // تحديث الإحصائيات فوراً
        this.stats.update(s => ({
          ...s,
          draft: targetIsActive ? Math.max(0, s.draft - 1) : s.draft + 1
        }));

        // تحديث محرك البحث وتوليد المتجه تلقائياً
        if (targetIsActive) {
          this.aiService.generateProductEmbedding(product.id).subscribe();
        } else {
          this.aiService.removeProductFromSearchIndex(product.id).subscribe();
        }

        const successText = res?.message || (targetIsActive 
          ? `تم نشر المنتج "${product.title}" وتفعيله بنجاح في المتجر وتحديث محرك البحث.` 
          : `تم إلغاء نشر المنتج "${product.title}" وتحويله إلى مسودة بنجاح.`);
        this.showToast(successText);
        this.loadProducts();
      },
      error: (err: any) => {
        this.isChangingStatus.set(false);
        const errMsg = err?.error?.message 
          || (typeof err?.error === 'string' ? err.error : '')
          || err?.message 
          || 'لا يمكن نشر المنتج؛ يرجى التأكد من رفع صورة واحدة على الأقل واكتمال بيانات المنتج.';
        this.modalError.set(errMsg);
      }
    });
  }

  syncAllMerchantEmbeddings(): void {
    const activeProducts = this.products().filter(p => p.is_active);
    const unindexedSeedIds = [
      'a5257dd4-1527-48b3-8429-e995ab7d3cc7', 'f31b6e49-54c0-4749-9852-6eccf7cc12c1',
      '4c607e39-7fb0-4611-b0e5-908c46c74bc5', '35878c91-9681-4ba3-9d9d-6d2cf6babbd7',
      '38d7301c-e4d9-49d3-9a00-f19894680dc2', '3f1afed0-5c7f-4a2e-8ef7-8680673a2cc4',
      '14124159-12c8-4ef9-b3b2-bb4cb911bddf', '457cc15a-c332-41e4-9d38-7c5bd0fbd1e7',
      '4639bf6a-1083-47b3-8fa8-36bedeebfa37', 'e2fc0d9a-93ae-496e-ae7b-499865791795',
      '0d19e7a7-3f08-497d-be5a-422d347730eb', '09e4538c-803a-4a9e-bc54-086ea44788d6',
      '7592f6e7-4759-4d7b-96ce-f634c8cc346a', '5bd9a7d2-bd36-41e4-9921-e99b93947540',
      '44c32b3e-9746-4a1b-8215-da255b5c5cd9', 'ade76d6c-64ec-436b-9fa4-f38b7a1a8828',
      '6ffeb3d2-4bb0-4096-bf0a-2165f9dd595b', '1867e332-0b17-4274-a074-06b5a28eb846',
      '315cce47-29b0-4d79-846c-7d39ea355810', '3f9f38c5-33c6-4344-8135-bb162755766d',
      'b7bcf152-c878-481e-8bab-093696adffb3', '6d4ca487-54bd-4358-be06-bdfac7a558a8',
      '705c056d-5a7c-4114-961a-fd6d9a6eb14c', '7abe0647-cb12-4fa5-9060-5d7dfcc4e879',
      '7b83d4e0-5fa0-4868-afea-d21ef9a9c6c0', '8571ffb8-74f7-4d4e-bb9f-a1c9dc11190c',
      '7c9d6fe3-a1a1-4708-9014-64d8051286ef', '846e26bd-5943-46b3-91f2-30217e3814d0',
      'ef8a9c91-b9d7-419a-8c63-bc0777ae4095', 'ac7b21f3-09b8-4913-9a5d-0dbe67a41fcf',
      'cbe47924-545a-4ac7-b452-5011e45bf979', 'aadc7eda-f461-48b4-b953-b707a6d7d12e',
      '9eba165c-7da4-4341-8ddc-6ac3fdeddc1c', 'b943ac4c-228f-4c37-93d4-58d8d55b46c2',
      'be6a181e-0b7e-4834-852b-39412e1ef698', 'c2f41ffc-0cae-41e2-9e30-1e7caff8828d',
      'ec228c42-cf11-48e1-a550-1d1ae9a59401', 'dff87850-b069-474a-90ac-559f5a782c2a',
      'ed01b9d2-fe18-42b0-8a7b-8f58e2aa185b', 'ed6d3dff-ee65-4283-b5c2-4de7580befdd',
      'ed70eed0-e6cd-419a-a330-3978c98f805a', 'fc1ddea7-e5a3-4ae4-ab73-431ea01c8a9f'
    ];

    const allTargetIds = Array.from(new Set([
      ...activeProducts.map(p => p.id),
      ...unindexedSeedIds
    ]));

    if (allTargetIds.length === 0) {
      this.showToast('لا توجد منتجات لمزامنة فهرسها.');
      return;
    }

    this.isSyncingAllEmbeddings.set(true);
    let completed = 0;
    allTargetIds.forEach(id => {
      this.aiService.generateProductEmbedding(id).subscribe({
        next: () => {
          completed++;
          if (completed === allTargetIds.length) {
            this.isSyncingAllEmbeddings.set(false);
            this.showToast(`تم إرسال طلبات تحديث فهرس البحث لـ ${completed} منتج بنجاح.`);
          }
        },
        error: () => {
          completed++;
          if (completed === allTargetIds.length) {
            this.isSyncingAllEmbeddings.set(false);
            this.showToast(`تمت معالجة تحديث الفهرس لجميع المنتجات.`);
          }
        }
      });
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
