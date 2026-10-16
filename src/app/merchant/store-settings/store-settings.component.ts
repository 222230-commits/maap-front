import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MerchantService, StoreProfile } from '../../core/services/merchant.service';
import { ProductService, Category } from '../../core/services/product.service';

@Component({
  selector: 'app-store-settings',  imports: [CommonModule],
  templateUrl: './store-settings.component.html',
  styleUrl: './store-settings.component.scss'
})
export class StoreSettingsComponent implements OnInit {
  private merchantService = inject(MerchantService);
  private productService  = inject(ProductService);
  public  router          = inject(Router);

  isLoading = signal(true);
  isSaving = signal(false);
  isUploadingLogo = signal(false);
  isUploadingBanner = signal(false);
  error = signal('');
  successMessage = signal('');
  activeTab = signal<'info' | 'images' | 'email' | 'change-email-form' | 'categories'>('info');
  store = signal<StoreProfile | null>(null);

  // categories tab
  allCategories       = signal<Category[]>([]);
  selectedCategoryIds = signal<string[]>([]);
  isLoadingCategories = signal(false);
  isSavingCategories  = signal(false);
  categorySuccess     = signal('');
  categoryError       = signal('');

  name = signal('');
  description = signal('');
  business_phone = signal('');
  instagram = signal('');
  facebook = signal('');
  accepts_returns = signal(false);
  accepts_card_payment = signal(false);
  policy_description = signal('');

  ngOnInit(): void {
    this.merchantService.getStoreProfile().subscribe({
      next: (res) => {
        const d = res.data;
        this.store.set(d);
        this.name.set(d.name ?? '');
        this.description.set(d.description ?? '');
        this.business_phone.set(d.business_phone ?? '');
        this.instagram.set(d.social_links?.instagram ?? '');
        this.facebook.set(d.social_links?.facebook ?? '');
        this.accepts_returns.set(d.accepts_returns ?? false);
        this.accepts_card_payment.set(d.accepts_card_payment ?? false);
        this.policy_description.set(d.policy_description ?? '');
        // تحميل التصنيفات المحددة الحالية للمتجر
        this.selectedCategoryIds.set(d.category_ids ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('فشل تحميل بيانات المتجر');
        this.isLoading.set(false);
      }
    });
  }

  async loadAllCategories(): Promise<void> {
    if (this.allCategories().length > 0) return; // تحميل مرة واحدة فقط
    this.isLoadingCategories.set(true);
    try {
      const collector: Category[] = [];
      await this.fetchCategoryTreeLevel(undefined, collector);
      this.allCategories.set(collector);
    } catch {
      this.categoryError.set('فشل تحميل التصنيفات');
    } finally {
      this.isLoadingCategories.set(false);
    }
  }

  private async fetchCategoryTreeLevel(
    parentId: string | undefined,
    collector: Category[]
  ): Promise<void> {
    const res = await firstValueFrom(
      this.productService.getCategories(parentId)
    );
    const items = res.data ?? [];
    for (const cat of items) {
      if (cat.is_leaf === true) {
        collector.push(cat);
      } else {
        await this.fetchCategoryTreeLevel(cat.id, collector);
      }
    }
  }

  toggleCategorySelection(id: string): void {
    this.selectedCategoryIds.update(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  }

  saveCategories(): void {
    this.isSavingCategories.set(true);
    this.categorySuccess.set('');
    this.categoryError.set('');
    this.merchantService.updateStoreCategories(this.selectedCategoryIds()).subscribe({
      next: () => {
        this.categorySuccess.set('تم حفظ التصنيفات بنجاح');
        this.isSavingCategories.set(false);
        setTimeout(() => this.categorySuccess.set(''), 3000);
      },
      error: (err) => {
        this.categoryError.set(err?.error?.message || 'فشل حفظ التصنيفات');
        this.isSavingCategories.set(false);
      }
    });
  }

  saveInfo(): void {
    this.isSaving.set(true);
    this.successMessage.set('');
    this.error.set('');
    this.merchantService.updateStoreProfile({
      name: this.name(),
      description: this.description(),
      business_phone: this.business_phone(),
      social_links: {
        instagram: this.instagram(),
        facebook: this.facebook()
      },
      accepts_returns: this.accepts_returns(),
      accepts_card_payment: this.accepts_card_payment(),
      policy_description: this.policy_description()
    }).subscribe({
      next: () => {
        this.successMessage.set('تم حفظ البيانات بنجاح');
        this.isSaving.set(false);
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'فشل الحفظ');
        this.isSaving.set(false);
      }
    });
  }

  onLogoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.isUploadingLogo.set(true);
    this.error.set('');
    this.merchantService.updateLogo(file).subscribe({
      next: () => {
        this.successMessage.set('تم تحديث الشعار بنجاح');
        this.isUploadingLogo.set(false);
        this.ngOnInit();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'فشل رفع الشعار');
        this.isUploadingLogo.set(false);
      }
    });
  }

  onBannerChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.isUploadingBanner.set(true);
    this.error.set('');
    this.merchantService.updateBanner(file).subscribe({
      next: () => {
        this.successMessage.set('تم تحديث البانر بنجاح');
        this.isUploadingBanner.set(false);
        this.ngOnInit();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'فشل رفع البانر');
        this.isUploadingBanner.set(false);
      }
    });
  }
}
