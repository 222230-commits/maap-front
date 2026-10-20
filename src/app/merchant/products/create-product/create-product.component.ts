import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProductService, Color, Size, Category } from '../../../core/services/product.service';
import { AiService } from '../../../core/services/ai.service';

@Component({
  selector: 'app-create-product',  templateUrl: './create-product.component.html',
  styleUrl: './create-product.component.scss'
})
export class CreateProductComponent implements OnInit {
  private productService = inject(ProductService);
  private aiService      = inject(AiService);
  public router = inject(Router);

  currentStep = signal<'info'|'attributes'|'images'|'publish'>('info');
  isLoading = signal(false);
  isSaving = signal(false);
  error = signal('');
  successMessage = signal('');

  createdProductId = signal<string | null>(null);

  title = signal('');
  description = signal('');
  price = signal<number>(0);
  compare_at_price = signal<number>(0);
  stock = signal<number>(0);
  selectedCategoryId = signal('');
  selectedColorIds = signal<string[]>([]);
  selectedSizeIds = signal<string[]>([]);

  colors = signal<Color[]>([]);
  sizes = signal<Size[]>([]);
  
  // تصنيف واحد يتنقل بالمستوى حتى العقدة الأخيرة
  currentLevelCategories = signal<Category[]>([]);
  isLoadingCategories = signal(false);
  categoryBreadcrumb = signal<{ id: string; name: string }[]>([]);
  selectedCategoryPath = signal('');

  generalFiles = signal<File[]>([]);
  generalPreviews = signal<string[]>([]);
  isUploadingImages = signal(false);

  ngOnInit(): void {
    // تحميل المستوى الأول من تصنيفات المتجر بالمستوى
    this.loadCategoryLevel();

    // تحميل الألوان
    this.productService.getColors().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.colors.set(list);
      },
      error: (err) => console.error('Colors load error:', err)
    });

    // تحميل المقاسات
    this.productService.getSizes().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.sizes.set(list);
      },
      error: (err) => console.error('Sizes load error:', err)
    });
  }

  loadCategoryLevel(parentId?: string): void {
    this.isLoadingCategories.set(true);
    this.productService.getCategories(parentId).subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.isLoadingCategories.set(false);

        // قاعدة: إذا كان للمتجر تصنيف واحد فقط في هذا المستوى، يتم التحديد/الدخول تلقائياً
        if (list.length === 1) {
          const single = list[0];
          if (single.is_leaf) {
            this.selectedCategoryId.set(single.id);
            const fullPath = [...this.categoryBreadcrumb().map(b => b.name), single.name].join(' › ');
            this.selectedCategoryPath.set(fullPath);
            this.currentLevelCategories.set([]);
            return;
          } else {
            this.categoryBreadcrumb.update(b => [...b, { id: single.id, name: single.name }]);
            this.loadCategoryLevel(single.id);
            return;
          }
        }

        this.currentLevelCategories.set(list);
      },
      error: () => {
        this.isLoadingCategories.set(false);
        this.currentLevelCategories.set([]);
      }
    });
  }

  onSelectCategory(cat: Category): void {
    if (cat.is_leaf) {
      // وصل للعقدة الأخيرة ويختارها
      this.selectedCategoryId.set(cat.id);
      const fullPath = [...this.categoryBreadcrumb().map(b => b.name), cat.name].join(' › ');
      this.selectedCategoryPath.set(fullPath);
    } else {
      // تعمق أكثر في الشجرة
      this.categoryBreadcrumb.update(b => [...b, { id: cat.id, name: cat.name }]);
      this.loadCategoryLevel(cat.id);
    }
  }

  onCategoryDropdownChange(catId: string): void {
    if (!catId) return;
    const cat = this.currentLevelCategories().find(c => c.id === catId);
    if (cat) {
      this.onSelectCategory(cat);
    }
  }

  goBackCategoryLevel(): void {
    const current = this.categoryBreadcrumb();
    if (current.length === 0) return;
    const updated = current.slice(0, -1);
    this.categoryBreadcrumb.set(updated);
    this.selectedCategoryId.set('');
    this.selectedCategoryPath.set('');
    const parentId = updated.length > 0 ? updated[updated.length - 1].id : undefined;
    this.loadCategoryLevel(parentId);
  }

  resetCategorySelection(): void {
    this.selectedCategoryId.set('');
    this.selectedCategoryPath.set('');
    this.categoryBreadcrumb.set([]);
    this.loadCategoryLevel();
  }

  toggleColor(id: string): void {
    this.selectedColorIds.update(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  }

  toggleSize(id: string): void {
    this.selectedSizeIds.update(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  }

  saveBasicInfo(): void {
    if (!this.title() || !this.title().trim()) {
      this.error.set('يرجى إدخال عنوان المنتج');
      return;
    }
    if (!this.selectedCategoryId()) {
      this.error.set('يرجى اختيار تصنيف المنتج حتى العقدة الأخيرة للمتابعة.');
      return;
    }
    if (this.price() <= 0) {
      this.error.set('يرجى إدخال سعر صحيح للمنتج');
      return;
    }

    this.isSaving.set(true);
    this.error.set('');
    this.productService.createProduct({
      category_id: this.selectedCategoryId(),
      title: this.title().trim(),
      description: this.description(),
      price: this.price(),
      compare_at_price: this.compare_at_price() || this.price(),
      stock: this.stock(),
      color_ids: this.selectedColorIds(),
      size_ids: this.selectedSizeIds()
    }).subscribe({
      next: (res) => {
        this.createdProductId.set(res.id);
        this.isSaving.set(false);
        // توليد متجه البحث فور الإنشاء
        this.aiService.generateProductEmbedding(res.id).subscribe();
        this.currentStep.set('images');
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'فشل إنشاء المنتج');
        this.isSaving.set(false);
      }
    });
  }

  onGeneralFilesChange(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    this.generalFiles.set(files);
    this.generalPreviews.set(files.map(f => URL.createObjectURL(f)));
  }

  uploadImages(): void {
    const id = this.createdProductId();
    if (!id || this.generalFiles().length === 0) {
      this.currentStep.set('publish');
      return;
    }
    this.isUploadingImages.set(true);
    this.error.set('');
    this.productService.uploadGeneralImages(id, this.generalFiles()).subscribe({
      next: () => {
        this.isUploadingImages.set(false);
        this.currentStep.set('publish');
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'فشل رفع الصور');
        this.isUploadingImages.set(false);
      }
    });
  }

  skipImages(): void {
    this.currentStep.set('publish');
  }

  publishProduct(): void {
    const id = this.createdProductId();
    if (!id) return;
    this.isSaving.set(true);
    this.error.set('');
    this.productService.togglePublish(id).subscribe({
      next: (res: any) => {
        if (res && res.success === false) {
          this.error.set(res.message || 'تعذر نشر المنتج؛ يرجى التأكد من رفع صورة واحدة على الأقل واكتمال البيانات.');
          this.isSaving.set(false);
          return;
        }
        // توليد المتجه وتحديث الفهرس تلقائياً
        this.aiService.generateProductEmbedding(id).subscribe();
        this.isSaving.set(false);
        this.successMessage.set('تم نشر المنتج بنجاح وتحديث محرك البحث!');
        setTimeout(() => {
          this.router.navigate(['/merchant/products']);
        }, 1500);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || err?.message || 'فشل نشر المنتج. يرجى التأكد من رفع صورة للمنتج أولاً.');
        this.isSaving.set(false);
      }
    });
  }

  saveDraft(): void {
    this.router.navigate(['/merchant/products']);
  }
}
