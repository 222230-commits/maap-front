import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BuyerService, DynamicCategory } from '../../core/services/buyer.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-merchant-upgrade',
  templateUrl: './merchant-upgrade.component.html',
  styleUrl: './merchant-upgrade.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MerchantUpgradeComponent implements OnInit {
  private buyerService = inject(BuyerService);
  private authService = inject(AuthService);
  public router = inject(Router);

  currentStep = signal<'check'|'form'|'otp'|'pending'|'approved'>('check');
  isLoading = signal(true);
  isSaving = signal(false);
  isResending = signal(false);
  isCheckingStatus = signal(false);
  error = signal('');
  successMessage = signal('');
  resendCooldown = signal(0);

  // Form Fields
  businessName = signal('');
  businessDescription = signal('');
  businessAddress = signal('');
  phoneNumber = signal('');
  email = signal(this.authService.currentUser()?.email ?? '');
  instagram = signal('');
  facebook = signal('');
  whatsapp = signal('');

  isLoadingCategories = signal(true);
  availableCategories = signal<DynamicCategory[]>([]);

  selectedCategoryIds = signal<string[]>([]);
  acceptedTerms = signal(false);
  otpCode = signal('');
  selectedLogo = signal<File | null>(null);
  logoPreview = signal<string | null>(null);

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedLogo.set(file);
      const reader = new FileReader();
      reader.onload = () => this.logoPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  async ngOnInit(): Promise<void> {
    if (this.authService.role() === 'merchant' || this.authService.currentUser()?.role === 'seller') {
      this.router.navigate(['/merchant']);
      return;
    }

    const freshUser = await this.authService.refreshUser();
    if (freshUser?.role === 'seller' || this.authService.role() === 'merchant') {
      this.router.navigate(['/merchant']);
      return;
    }

    this.buyerService.getDynamicCategories().subscribe({
      next: (res) => {
        this.availableCategories.set(res.data);
        this.isLoadingCategories.set(false);
      },
      error: () => this.isLoadingCategories.set(false)
    });

    this.buyerService.checkPendingUpgrade().subscribe({
      next: async (res) => {
        if (res.status === 'approved' || (res as any).is_approved) {
          await this.authService.refreshUser();
          this.currentStep.set('approved');
        } else if (res.has_pending || res.status === 'pending') {
          this.currentStep.set('pending');
        } else {
          this.currentStep.set('form');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.currentStep.set('form');
        this.isLoading.set(false);
      }
    });
  }

  toggleCategory(id: string): void {
    this.selectedCategoryIds.update(ids =>
      ids.includes(id)
        ? ids.filter(i => i !== id)
        : [...ids, id]
    );
  }

  isSelectedCategory(id: string): boolean {
    return this.selectedCategoryIds().includes(id);
  }

  validateForm(): string | null {
    if (!this.businessName()) return 'أدخل اسم المتجر';
    if (!this.businessDescription()) return 'أدخل وصف المتجر';
    if (!this.businessAddress()) return 'أدخل عنوان المتجر';
    if (!this.phoneNumber()) return 'أدخل رقم الهاتف';
    if (!this.email()) return 'أدخل البريد الإلكتروني';
    if (this.selectedCategoryIds().length === 0) return 'اختر تصنيفاً واحداً على الأقل';
    if (!this.acceptedTerms()) return 'يجب الموافقة على الشروط والأحكام';
    return null;
  }

  submitForm(): void {
    const validationError = this.validateForm();
    if (validationError) {
      this.error.set(validationError);
      return;
    }
    this.isSaving.set(true);
    this.error.set('');

    this.buyerService.requestUpgrade({
      business_name: this.businessName(),
      business_description: this.businessDescription(),
      business_address: this.businessAddress(),
      phone_number: this.phoneNumber(),
      email: this.email(),
      category_ids: this.selectedCategoryIds(),
      accepted_terms: this.acceptedTerms(),
      business_logo: this.selectedLogo(),
      social_links: {
        instagram: this.instagram() || undefined,
        facebook: this.facebook() || undefined,
        whatsapp: this.whatsapp() || undefined
      }
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.currentStep.set('otp');
        this.startResendCooldown();
      },
      error: (err: any) => {
        let msg = 'فشل إرسال الطلب';
        const errObj = err?.error;
        if (errObj?.errors && typeof errObj.errors === 'object') {
          const allMsgs = Object.values(errObj.errors)
            .flat()
            .filter((m): m is string => typeof m === 'string');
          if (allMsgs.length > 0) {
            msg = allMsgs.join(' — ');
          }
        } else if (errObj?.message) {
          msg = errObj.message;
        }
        this.error.set(msg);
        this.isSaving.set(false);
      }
    });
  }

  verifyOtp(): void {
    if (this.otpCode().length < 4) {
      this.error.set('أدخل رمز التحقق');
      return;
    }
    this.isSaving.set(true);
    this.error.set('');

    this.buyerService.verifyUpgrade(this.otpCode()).subscribe({
      next: async (res: any) => {
        this.isSaving.set(false);
        const user = await this.authService.refreshUser();
        if (user?.role === 'seller' || this.authService.role() === 'merchant' || res?.status === 'approved') {
          this.currentStep.set('approved');
          setTimeout(() => {
            this.router.navigate(['/merchant']);
          }, 1500);
        } else {
          this.currentStep.set('pending');
        }
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'الرمز غير صحيح');
        this.isSaving.set(false);
      }
    });
  }

  checkStatusAgain(): void {
    this.isCheckingStatus.set(true);
    this.buyerService.checkPendingUpgrade().subscribe({
      next: async (res) => {
        const user = await this.authService.refreshUser();
        this.isCheckingStatus.set(false);
        if (user?.role === 'seller' || this.authService.role() === 'merchant' || res.status === 'approved') {
          this.currentStep.set('approved');
          setTimeout(() => {
            this.router.navigate(['/merchant']);
          }, 1500);
        } else if (res.has_pending) {
          this.successMessage.set('الطلب لا يزال قيد المراجعة');
          setTimeout(() => this.successMessage.set(''), 3000);
        } else {
          this.currentStep.set('form');
        }
      },
      error: () => {
        this.isCheckingStatus.set(false);
      }
    });
  }

  resendOtp(): void {
    if (this.resendCooldown() > 0) return;
    this.isResending.set(true);
    this.buyerService.resendUpgradeOtp().subscribe({
      next: () => {
        this.isResending.set(false);
        this.successMessage.set('تم إعادة إرسال الرمز');
        this.startResendCooldown();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => {
        this.isResending.set(false);
        this.error.set('فشل إعادة الإرسال');
      }
    });
  }

  startResendCooldown(): void {
    this.resendCooldown.set(120);
    const timer = setInterval(() => {
      this.resendCooldown.update(v => {
        if (v <= 1) {
          clearInterval(timer);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  updateOtp(v: string): void {
    this.otpCode.set(v);
  }
}
