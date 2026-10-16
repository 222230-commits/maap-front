import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProductService, Color, Size, Category } from '../../../core/services/product.service';

@Component({
  selector: 'app-create-product',  templateUrl: './create-product.component.html',
  styleUrl: './create-product.component.scss'
})
export class CreateProductComponent implements OnInit {
  private productService = inject(ProductService);
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
  categories = signal<Category[]>([]);
  rootCategories = signal<Category[]>([]);
  selectedRootCategoryId = signal('');

  subCategories = signal<Category[]>([]);
  selectedSubCategoryId = signal('');
  isLoadingSubCategories = signal(false);

  childCategories = signal<Category[]>([]);
  selectedChildCategoryId = signal('');
  isLoadingChildCategories = signal(false);

  generalFiles = signal<File[]>([]);
  generalPreviews = signal<string[]>([]);
  isUploadingImages = signal(false);

  ngOnInit(): void {
    forkJoin({
      colors: this.productService.getColors(),
      sizes: this.productService.getSizes(),
      cats: this.productService.getCategories()
    }).subscribe({
      next: ({ colors, sizes, cats }) => {
        this.colors.set(colors.data);
        this.sizes.set(sizes.data);
        this.rootCategories.set(cats.data);
        this.categories.set(cats.data);
      }
    });
  }

  onRootCategoryChange(rootId: string): void {
    this.selectedRootCategoryId.set(rootId);
    this.selectedSubCategoryId.set('');
    this.selectedChildCategoryId.set('');
    this.selectedCategoryId.set('');
    this.subCategories.set([]);
    this.childCategories.set([]);

    if (!rootId) return;

    this.isLoadingSubCategories.set(true);
    this.productService.getCategories(rootId).subscribe({
      next: (res) => {
        const subs = res.data || [];
        this.subCategories.set(subs);
        this.isLoadingSubCategories.set(false);
      },
      error: () => this.isLoadingSubCategories.set(false)
    });
  }

  onSubCategoryChange(subId: string): void {
    this.selectedSubCategoryId.set(subId);
    this.selectedChildCategoryId.set('');
    this.childCategories.set([]);

    if (!subId) {
      this.selectedCategoryId.set('');
      return;
    }

    this.selectedCategoryId.set(subId);

    this.isLoadingChildCategories.set(true);
    this.productService.getCategories(subId).subscribe({
      next: (res) => {
        const children = res.data || [];
        this.childCategories.set(children);
        this.isLoadingChildCategories.set(false);
      },
      error: () => this.isLoadingChildCategories.set(false)
    });
  }

  onChildCategoryChange(childId: string): void {
    this.selectedChildCategoryId.set(childId);
    if (childId) {
      this.selectedCategoryId.set(childId);
    } else {
      this.selectedCategoryId.set(this.selectedSubCategoryId());
    }
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
    if (!this.selectedRootCategoryId()) {
      this.error.set('يرجى اختيار التصنيف الرئيسي');
      return;
    }
    if (!this.selectedCategoryId()) {
      this.error.set('لا يمكن نقل المنتج لتصنيف رئيسي، يجب اختيار تصنيف فرعي يمتلك تصنيفاً أباً.');
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
    this.productService.togglePublish(id).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.successMessage.set('تم نشر المنتج بنجاح!');
        setTimeout(() => {
          this.router.navigate(['/merchant/products']);
        }, 1500);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'فشل النشر');
        this.isSaving.set(false);
      }
    });
  }

  saveDraft(): void {
    this.router.navigate(['/merchant/products']);
  }
}
