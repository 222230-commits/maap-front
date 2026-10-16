import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MerchantService } from '@core/services/merchant.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-merchant-profile',  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './merchant-profile.component.html',
  styleUrl: './merchant-profile.component.scss'
})
export class MerchantProfileComponent implements OnInit {
  private merchantService = inject(MerchantService);
  public  authService     = inject(AuthService);
  public  router          = inject(Router);

  isLoading   = signal(true);
  isSaving    = signal(false);
  logoUrl     = signal<string>('');
  saved       = signal(false);
  activeTab   = signal<'info' | 'social' | 'account'>('info');

  store       = signal<any>(null);
  dashData    = signal<any>(null);

  // الـ HTML القديم يستخدم shopInfo().businessName — نُعيّنه من الـ API
  shopInfo = signal<any>({ businessName: '', description: '', phone: '', email: '', socialLinks: {} });

  // الـ HTML القديم يستخدم currentUser()?.email
  currentUser = this.authService.currentUser;

  editData = signal({
    businessName: '',
    description:  '',
    phone:        '',
    email:        '',
    whatsapp:     '',
    instagram:    '',
    facebook:     '',
    tiktok:       '',
    snapchat:     '',
    socialEmail:  ''
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.merchantService.getStoreProfile().subscribe({
      next: (res) => {
        const d = res.data;
        this.store.set(d);

        // تعبئة shopInfo بنفس شكل الـ Mock القديم
        this.shopInfo.set({
          businessName: d.name ?? '',
          description:  d.description ?? '',
          phone:        d.business_phone ?? '',
          email:        d.email ?? '',
          socialLinks: {
            whatsapp:  '',
            instagram: d.social_links?.instagram ?? '',
            facebook:  d.social_links?.facebook  ?? ''
          }
        });

        // تعبئة نموذج التعديل
        this.editData.set({
          businessName: d.name ?? '',
          description:  d.description ?? '',
          phone:        d.business_phone ?? '',
          email:        d.email ?? '',
          whatsapp:     '',
          instagram:    d.social_links?.instagram ?? '',
          facebook:     d.social_links?.facebook  ?? '',
          tiktok:       '',
          snapchat:     '',
          socialEmail:  ''
        });

        // شعار المتجر
        if (d.logo_url) this.logoUrl.set(d.logo_url);

        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.merchantService.getDashboard().subscribe({
      next: (res) => {
        this.dashData.set(res?.data);
      },
      error: () => {}
    });
  }

  updateField(field: string, value: string): void {
    this.editData.update(d => ({ ...d, [field]: value }));
  }

  onLogoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // معاينة فورية
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      this.logoUrl.set(url);
      this.store.update(s => s ? { ...s, logo_url: url } : s);
    };
    reader.readAsDataURL(file);

    this.merchantService.updateLogo(file).subscribe({
      next: () => this.loadData(),
      error: () => {}
    });
  }

  onBannerChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // معاينة فورية
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      this.store.update(s => s ? { ...s, banner_url: url } : s);
    };
    reader.readAsDataURL(file);

    this.merchantService.updateBanner(file).subscribe({
      next: () => this.loadData(),
      error: () => {}
    });
  }

  onLogoUpload(event: Event): void {
    this.onLogoChange(event);
  }

  saveProfile(): void {
    this.isSaving.set(true);
    this.merchantService.updateStoreProfile({
      name:                this.editData().businessName,
      description:         this.editData().description,
      business_phone:      this.editData().phone,
      social_links: {
        instagram: this.editData().instagram,
        facebook:  this.editData().facebook
      },
      accepts_returns:      false,
      accepts_card_payment: false,
      policy_description:   ''
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: () => this.isSaving.set(false)
    });
  }
}
