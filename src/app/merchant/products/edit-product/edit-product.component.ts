import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProductService } from '@core/services/product.service';
import type { Color, Size, Category, Tag, Feature } from '@core/services/product.service';
import { AiService } from '@core/services/ai.service';

@Component({
  selector: 'app-edit-product',  imports: [CommonModule, RouterModule],
  templateUrl: './edit-product.component.html',
  styleUrl: './edit-product.component.scss'
})
export class EditProductComponent implements OnInit {
  private productService = inject(ProductService);
  private aiService      = inject(AiService);
  protected router = inject(Router);
  private route = inject(ActivatedRoute);

  productId = signal('');
  isLoading = signal(true);
  isSaving = signal(false);
  error = signal('');
  successMessage = signal('');
  activeTab = signal<'info'|'images'|'extras'>('info');

  productTags = signal<Tag[]>([]);
  productFeatures = signal<Feature[]>([]);
  availableTags = signal<Tag[]>([]);
  availableFeatures = signal<Feature[]>([]);
  newTagName = signal('');
  newFeatureName = signal('');
  isAddingTag = signal(false);
  isAddingFeature = signal(false);
  isDetachingTagId = signal<string | null>(null);
  isDetachingFeatureId = signal<string | null>(null);

  // ── Edit / Delete Tags & Features ────────────────────────
  editingTagId       = signal<string | null>(null);
  editingTagName     = signal('');
  editingFeatureId   = signal<string | null>(null);
  editingFeatureName = signal('');
  isSavingEdit       = signal(false);
  deletingItemId     = signal<string | null>(null);
  confirmDeleteItem  = signal<{ type: 'tag' | 'feature'; id: string; name: string } | null>(null);

  // بيانات الـ form
  title = signal('');
  description = signal('');
  price = signal(0);
  compareAtPrice = signal(0);
  stock = signal(0);
  selectedCategoryId = signal('');
  selectedColorIds = signal<string[]>([]);
  selectedSizeIds = signal<string[]>([]);

  // بيانات من الـ API
  colors = signal<Color[]>([]);
  productColors = computed(() => {
    const selectedIds = this.selectedColorIds();
    const all = this.colors();
    if (selectedIds.length === 0) return all;
    return all.filter(c => selectedIds.includes(c.id));
  });
  sizes = signal<Size[]>([]);
  categories = signal<Category[]>([]);
  currentCategoryName = signal('');
  selectedCategoryPath = signal('');
  isChangingCategory = signal(false);

  // تصنيف واحد يتنقل بالمستوى حتى العقدة الأخيرة
  currentLevelCategories = signal<Category[]>([]);
  isLoadingCategories = signal(false);
  categoryBreadcrumb = signal<{ id: string; name: string }[]>([]);

  productImages = signal<{
    total_count: number;
    primary: any;
    grouped: Record<string, any[]>
  }>({ total_count: 0, primary: null, grouped: {} });

  // images management
  isUploadingImage = signal(false);
  isDeletingImageId = signal<string | null>(null);
  isSettingPrimary = signal<string | null>(null);
  isSortingImages = signal(false);
  draggedImageId = signal<string | null>(null);
  selectedColorForUpload = signal('');
  generalImageFiles = signal<File[]>([]);
  generalImagePreviews = signal<string[]>([]);
  
  colorImageFiles = signal<File[]>([]);
  colorImagePreviews = signal<string[]>([]);
  isUploadingColorImage = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.productId.set(id);

    // جلب الألوان
    this.productService.getColors().subscribe({
      next: (res) => this.colors.set(Array.isArray(res?.data) ? res.data : []),
      error: () => this.colors.set([])
    });

    // جلب المقاسات
    this.productService.getSizes().subscribe({
      next: (res) => this.sizes.set(Array.isArray(res?.data) ? res.data : []),
      error: () => this.sizes.set([])
    });

    // جلب بيانات المنتج والتاغات
    this.loadProduct();
    this.loadTagsAndFeatures();
  }

  startCategoryChange(): void {
    this.isChangingCategory.set(true);
    this.categoryBreadcrumb.set([]);
    this.loadCategoryLevel();
  }

  cancelCategoryChange(): void {
    this.isChangingCategory.set(false);
    this.categoryBreadcrumb.set([]);
    this.currentLevelCategories.set([]);
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
            this.currentCategoryName.set(fullPath);
            this.selectedCategoryPath.set(fullPath);
            this.currentLevelCategories.set([]);
            this.isChangingCategory.set(false);
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
      this.currentCategoryName.set(fullPath);
      this.selectedCategoryPath.set(fullPath);
      this.isChangingCategory.set(false);
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
    const parentId = updated.length > 0 ? updated[updated.length - 1].id : undefined;
    this.loadCategoryLevel(parentId);
  }

  resetCategorySelection(): void {
    this.categoryBreadcrumb.set([]);
    this.loadCategoryLevel();
  }

  loadProduct(): void {
    this.isLoading.set(true);
    this.productService.getProduct(this.productId()).subscribe({
      next: (res) => {
        const p = res.data;
        this.title.set(p.title);
        this.description.set(p.description);
        this.price.set(p.price);
        this.compareAtPrice.set(p.compare_at_price ?? 0);
        this.stock.set(p.stock);
        this.selectedCategoryId.set(p.category_id);
        if (p.category?.name) {
          this.currentCategoryName.set(p.category.name);
        }
        this.selectedColorIds.set(p.colors?.map(c => c.id) ?? []);
        this.selectedSizeIds.set(p.sizes?.map((s: any) => s.id) ?? []);
        
        // جلب التاغات والميزات من بيانات المنتج
        this.productTags.set(
          p.tags_list?.map((name: string) => ({ id: name, name })) ?? []
        );
        this.productFeatures.set(
          p.features_list?.map((name: string) => ({ id: name, name })) ?? []
        );

        this.isLoading.set(false);
        // جلب صور المنتج
        this.loadProductImages();
      },
      error: () => {
        this.error.set('فشل تحميل المنتج');
        this.isLoading.set(false);
      }
    });
  }

  loadTagsAndFeatures(): void {
    forkJoin({
      tags: this.productService.getTags(),
      features: this.productService.getFeatures()
    }).subscribe({
      next: ({ tags, features }) => {
        // تمييز system_tags بخاصية isSystem لإخفاء أزرار التعديل/الحذف عنها
        this.availableTags.set([
          ...(tags.data.system_tags || []).map((t: any) => ({ ...t, isSystem: true })),
          ...(tags.data.merchant_tags || []).map((t: any) => ({ ...t, isSystem: false }))
        ] as any);
        this.availableFeatures.set([
          ...(features.data.system_features || []).map((f: any) => ({ ...f, isSystem: true })),
          ...(features.data.merchant_features || []).map((f: any) => ({ ...f, isSystem: false }))
        ] as any);
      }
    });
  }

  loadProductImages(): void {
    this.productService.getProductImages(this.productId()).subscribe({
      next: (res) => {
        this.productImages.set(res.data);
      }
    });
  }

  saveProduct(): void {
    if (!this.selectedCategoryId()) {
      this.error.set('يرجى اختيار تصنيف المنتج حتى العقدة الأخيرة للمتابعة.');
      return;
    }

    this.isSaving.set(true);
    this.error.set('');
    this.productService.updateProduct(this.productId(), {
      category_id: this.selectedCategoryId(),
      title: this.title(),
      description: this.description(),
      price: this.price(),
      compare_at_price: this.compareAtPrice(),
      stock: this.stock(),
      color_ids: this.selectedColorIds(),
      size_ids: this.selectedSizeIds()
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        // توليد متجه البحث وتحديث الفهرس تلقائياً عند تعديل المنتج
        this.aiService.generateProductEmbedding(this.productId()).subscribe();
        this.successMessage.set('تم حفظ التعديلات بنجاح وتحديث فهرس البحث');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'فشل الحفظ');
        this.isSaving.set(false);
      }
    });
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

  onGeneralImagesChange(event: Event): void {
    const files = Array.from(
      (event.target as HTMLInputElement).files ?? []
    );
    this.generalImageFiles.set(files);
    this.generalImagePreviews.set(
      files.map(f => URL.createObjectURL(f))
    );
  }

  uploadGeneralImages(): void {
    if (this.generalImageFiles().length === 0) return;
    this.isUploadingImage.set(true);
    this.productService.uploadGeneralImages(
      this.productId(), this.generalImageFiles()
    ).subscribe({
      next: () => {
        this.isUploadingImage.set(false);
        this.generalImageFiles.set([]);
        this.generalImagePreviews.set([]);
        this.loadProductImages();
        this.aiService.generateProductEmbedding(this.productId()).subscribe();
        this.successMessage.set('تم رفع الصور بنجاح وتحديث فهرس البحث');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => {
        this.error.set('فشل رفع الصور');
        this.isUploadingImage.set(false);
      }
    });
  }

  onColorImagesChange(event: Event): void {
    const files = Array.from(
      (event.target as HTMLInputElement).files ?? []
    );
    this.colorImageFiles.set(files);
    this.colorImagePreviews.set(
      files.map(f => URL.createObjectURL(f))
    );
  }

  uploadColorImages(): void {
    if (this.colorImageFiles().length === 0 || !this.selectedColorForUpload()) return;
    this.isUploadingColorImage.set(true);
    this.productService.uploadImagesWithColor(
      this.productId(),
      this.colorImageFiles(),
      this.selectedColorForUpload()
    ).subscribe({
      next: () => {
        this.isUploadingColorImage.set(false);
        this.colorImageFiles.set([]);
        this.colorImagePreviews.set([]);
        this.selectedColorForUpload.set('');
        this.loadProductImages();
        this.aiService.generateProductEmbedding(this.productId()).subscribe();
        this.successMessage.set('تم رفع الصور وربطها باللون بنجاح وتحديث فهرس البحث');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => {
        this.error.set('فشل رفع الصور');
        this.isUploadingColorImage.set(false);
      }
    });
  }

  deleteImage(imageId: string): void {
    this.isDeletingImageId.set(imageId);
    this.productService.deleteImage(this.productId(), imageId).subscribe({
      next: () => {
        this.isDeletingImageId.set(null);
        this.loadProductImages();
      },
      error: () => this.isDeletingImageId.set(null)
    });
  }

  setPrimaryImage(imageId: string): void {
    this.isSettingPrimary.set(imageId);
    this.productService.setPrimaryImage(this.productId(), imageId).subscribe({
      next: () => {
        this.isSettingPrimary.set(null);
        this.loadProductImages();
        this.successMessage.set('تم تعيين صورة الغلاف');
        setTimeout(() => this.successMessage.set(''), 2000);
      },
      error: () => this.isSettingPrimary.set(null)
    });
  }

  getGroupedImages(): { key: string; images: any[] }[] {
    const grouped = this.productImages()?.grouped ?? {};
    return Object.entries(grouped).map(([key, images]) => ({
      key, images: images as any[]
    }));
  }

  getColorName(colorId: string): string {
    if (colorId === 'general') return 'عامة';
    return this.colors().find(c => c.id === colorId)?.name ?? colorId;
  }

  onImageDragStart(imageId: string): void {
    this.draggedImageId.set(imageId);
  }

  onImageDrop(targetImageId: string, groupKey: string): void {
    const draggedId = this.draggedImageId();
    if (!draggedId || draggedId === targetImageId) return;

    const grouped = this.productImages().grouped ?? {};
    const groupImages = [...(grouped[groupKey] ?? [])];
    const draggedIndex = groupImages.findIndex((img: any) => img.id === draggedId);
    const targetIndex  = groupImages.findIndex((img: any) => img.id === targetImageId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const [moved] = groupImages.splice(draggedIndex, 1);
    groupImages.splice(targetIndex, 0, moved);

    // تحديث محلي فوري
    this.productImages.update(current => ({
      ...current,
      grouped: { ...current.grouped, [groupKey]: groupImages }
    }));

    this.isSortingImages.set(true);
    const orderedIds = groupImages.map((img: any) => img.id);
    this.productService.sortImages(this.productId(), orderedIds).subscribe({
      next: () => this.isSortingImages.set(false),
      error: () => {
        this.isSortingImages.set(false);
        this.loadProductImages(); // استرجاع الترتيب الأصلي عند الفشل
      }
    });
    this.draggedImageId.set(null);
  }

  createAndAttachTag(): void {
    if (!this.newTagName()) return;
    this.isAddingTag.set(true);
    this.productService.createTag(
      this.productId(), this.newTagName()
    ).subscribe({
      next: () => {
        this.newTagName.set('');
        this.isAddingTag.set(false);
        this.loadProduct();
        this.loadTagsAndFeatures();
      },
      error: () => this.isAddingTag.set(false)
    });
  }

  detachTag(tag: Tag): void {
    this.isDetachingTagId.set(tag.id);
    this.productService.detachTags(this.productId(), [tag.id]).subscribe({
      next: () => {
        this.isDetachingTagId.set(null);
        this.loadProduct();
      },
      error: () => this.isDetachingTagId.set(null)
    });
  }

  createAndAttachFeature(): void {
    if (!this.newFeatureName()) return;
    this.isAddingFeature.set(true);
    this.productService.createFeature(
      this.productId(), this.newFeatureName()
    ).subscribe({
      next: () => {
        this.newFeatureName.set('');
        this.isAddingFeature.set(false);
        this.loadProduct();
        this.loadTagsAndFeatures();
      },
      error: () => this.isAddingFeature.set(false)
    });
  }

  detachFeature(feature: Feature): void {
    this.isDetachingFeatureId.set(feature.id);
    this.productService.detachFeatures(
      this.productId(), [feature.id]
    ).subscribe({
      next: () => {
        this.isDetachingFeatureId.set(null);
        this.loadProduct();
      },
      error: () => this.isDetachingFeatureId.set(null)
    });
  }

  // ── isSystemItem ────────────────────────────────────────────
  isSystemItem(item: any): boolean {
    return !!(item as any).isSystem;
  }

  // ── Edit Tag ────────────────────────────────────────────
  startEditTag(tag: any): void {
    if (this.isSystemItem(tag)) return;
    this.editingTagId.set(tag.id);
    this.editingTagName.set(tag.name);
  }

  saveTagEdit(): void {
    const id = this.editingTagId();
    if (!id) return;
    this.isSavingEdit.set(true);
    this.productService.updateTag(id, this.editingTagName()).subscribe({
      next: () => {
        this.isSavingEdit.set(false);
        this.editingTagId.set(null);
        this.loadTagsAndFeatures();
        this.loadProduct();
      },
      error: () => this.isSavingEdit.set(false)
    });
  }

  // ── Edit Feature ─────────────────────────────────────────
  startEditFeature(feature: any): void {
    if (this.isSystemItem(feature)) return;
    this.editingFeatureId.set(feature.id);
    this.editingFeatureName.set(feature.name);
  }

  saveFeatureEdit(): void {
    const id = this.editingFeatureId();
    if (!id) return;
    this.isSavingEdit.set(true);
    this.productService.updateFeature(id, this.editingFeatureName()).subscribe({
      next: () => {
        this.isSavingEdit.set(false);
        this.editingFeatureId.set(null);
        this.loadTagsAndFeatures();
        this.loadProduct();
      },
      error: () => this.isSavingEdit.set(false)
    });
  }

  // ── Delete ──────────────────────────────────────────────────
  requestDelete(type: 'tag' | 'feature', id: string, name: string): void {
    this.confirmDeleteItem.set({ type, id, name });
  }

  executeDelete(): void {
    const target = this.confirmDeleteItem();
    if (!target) return;
    this.deletingItemId.set(target.id);
    const call = target.type === 'tag'
      ? this.productService.deleteTag(target.id)
      : this.productService.deleteFeature(target.id);
    call.subscribe({
      next: () => {
        this.deletingItemId.set(null);
        this.confirmDeleteItem.set(null);
        this.loadTagsAndFeatures();
        this.loadProduct();
      },
      error: () => this.deletingItemId.set(null)
    });
  }
}
