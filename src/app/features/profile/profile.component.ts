import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService, UserProfile } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);
  public authService  = inject(AuthService);
  public cartService  = inject(CartService);
  public router       = inject(Router);

  isMerchant = computed(() =>
    this.authService.role() === 'merchant' ||
    this.profile()?.role === 'seller' ||
    this.profile()?.role === 'merchant'
  );

  goToMerchantOrUpgrade(): void {
    if (this.isMerchant()) {
      this.router.navigate(['/merchant']);
    } else {
      this.router.navigate(['/become-merchant']);
    }
  }

  isLoading = signal(true);
  error = signal('');
  profile = signal<UserProfile | null>(null);

  isEditing = signal(false);
  isSaving = signal(false);
  isUploadingAvatar = signal(false);
  editError = signal('');
  editSuccess = signal('');

  // ── Phone OTP — 2-step ──
  showPhoneOtpModal  = signal(false);
  isSendingPhoneOtp  = signal(false);
  phoneOtpSent       = signal(false);   // خطوة 2: إدخال OTP
  phoneOtpCode       = signal('');
  isVerifyingPhone   = signal(false);
  phoneOtpMsg        = signal('');
  phoneOtpError      = signal('');

  // ── تغيير البريد الإلكتروني ──
  showEmailChange   = signal(false);
  newEmail          = signal('');
  emailOtpStep      = signal(false);   // true = نحن في خطوة OTP
  emailOtpCode      = signal('');
  isRequestingEmail = signal(false);
  isVerifyingEmail  = signal(false);
  emailChangeMsg    = signal('');
  emailChangeError  = signal('');

  editForm = {
    full_name:    signal(''),
    phone_number: signal(''),
    address:      signal('')
  };

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.userService.getProfile().subscribe({
      next: (res) => {
        this.profile.set(res.data);
        if (res.data?.role) {
          this.authService.updateUserRole(res.data.role);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('فشل تحميل الملف الشخصي');
        this.isLoading.set(false);
      }
    });
  }

  startEdit(): void {
    this.editForm.full_name.set(this.profile()?.full_name ?? '');
    this.editForm.phone_number.set(this.profile()?.phone_number ?? '');
    this.editForm.address.set(this.profile()?.address ?? '');
    this.isEditing.set(true);
    this.editError.set('');
    this.editSuccess.set('');
  }

  cancelEdit(): void { this.isEditing.set(false); }

  saveProfile(): void {
    this.isSaving.set(true);
    this.editError.set('');
    this.userService.updateProfile({
      full_name:    this.editForm.full_name(),
      phone_number: this.editForm.phone_number(),
      address:      this.editForm.address()
    }).subscribe({
      next: (res) => {
        this.profile.set(res.data);
        this.isSaving.set(false);
        this.isEditing.set(false);
        this.editSuccess.set('تم تحديث البيانات بنجاح');
        setTimeout(() => this.editSuccess.set(''), 3000);
      },
      error: (err) => {
        this.editError.set(err?.error?.message || 'فشل التحديث');
        this.isSaving.set(false);
      }
    });
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.isUploadingAvatar.set(true);
    this.userService.updateAvatar(file).subscribe({
      next: (res) => {
        this.profile.update(p => p
          ? { ...p, avatar_url: res?.data?.avatar_url ?? p.avatar_url }
          : p
        );
        this.isUploadingAvatar.set(false);
        this.editSuccess.set('تم تحديث الصورة بنجاح');
        setTimeout(() => this.editSuccess.set(''), 3000);
      },
      error: () => {
        this.editError.set('فشل رفع الصورة');
        this.isUploadingAvatar.set(false);
      }
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('ar-LY');
  }

  logout(): void { this.authService.logout(); }

  // ── Phone OTP Methods ──────────────────────────────────────
  openPhoneOtp(): void {
    this.showPhoneOtpModal.set(true);
    this.phoneOtpSent.set(false);
    this.phoneOtpCode.set('');
    this.phoneOtpMsg.set('');
    this.phoneOtpError.set('');
  }

  closePhoneOtp(): void {
    this.showPhoneOtpModal.set(false);
    this.phoneOtpSent.set(false);
  }

  sendPhoneOtp(): void {
    const phone = this.editForm.phone_number() || this.profile()?.phone_number || '';
    if (!phone) {
      this.phoneOtpError.set('لا يوجد رقم هاتف مرتبط بحسابك');
      return;
    }
    this.isSendingPhoneOtp.set(true);
    this.phoneOtpError.set('');
    this.authService.sendPhoneOtp(phone).subscribe({
      next: () => {
        this.isSendingPhoneOtp.set(false);
        this.phoneOtpSent.set(true);
        this.phoneOtpMsg.set('تم إرسال رمز التحقق إلى هاتفك');
      },
      error: (err) => {
        this.isSendingPhoneOtp.set(false);
        this.phoneOtpError.set(err?.error?.message || 'فشل إرسال الرمز — تأكد من صحة رقم الهاتف');
      }
    });
  }

  verifyPhoneOtp(): void {
    const phone = this.editForm.phone_number() || this.profile()?.phone_number || '';
    const otp   = this.phoneOtpCode().trim();
    if (!otp || otp.length < 4) { this.phoneOtpError.set('أدخل رمز التحقق'); return; }
    this.isVerifyingPhone.set(true);
    this.phoneOtpError.set('');
    this.authService.verifyPhoneOtp(phone, otp).subscribe({
      next: () => {
        this.isVerifyingPhone.set(false);
        this.phoneOtpMsg.set('✔ تم توثيق رقم الهاتف بنجاح');
        setTimeout(() => this.closePhoneOtp(), 2000);
      },
      error: (err) => {
        this.isVerifyingPhone.set(false);
        this.phoneOtpError.set(err?.error?.message || 'الرمز غير صحيح');
      }
    });
  }

  // ── Email Change Methods ──────────────────────────────────────
  openEmailChange(): void {
    this.showEmailChange.set(true);
    this.emailOtpStep.set(false);
    this.newEmail.set('');
    this.emailOtpCode.set('');
    this.emailChangeMsg.set('');
    this.emailChangeError.set('');
  }

  closeEmailChange(): void {
    this.showEmailChange.set(false);
    this.emailOtpStep.set(false);
  }

  requestEmailChange(): void {
    const email = this.newEmail().trim();
    if (!email || !email.includes('@')) {
      this.emailChangeError.set('أدخل بريداً إلكترونياً صحيحاً');
      return;
    }
    this.isRequestingEmail.set(true);
    this.emailChangeError.set('');
    this.userService.requestEmailChange(email).subscribe({
      next: (res) => {
        this.isRequestingEmail.set(false);
        this.emailOtpStep.set(true);
        this.emailChangeMsg.set(res?.message || 'تم إرسال رمز التحقق إلى البريد الجديد');
      },
      error: (err) => {
        this.emailChangeError.set(err?.error?.message || 'فشل إرسال الطلب');
        this.isRequestingEmail.set(false);
      }
    });
  }

  verifyEmailChange(): void {
    const otp = this.emailOtpCode().trim();
    if (otp.length < 4) {
      this.emailChangeError.set('أدخل رمز التحقق');
      return;
    }
    this.isVerifyingEmail.set(true);
    this.emailChangeError.set('');
    this.userService.verifyEmailChange(this.newEmail(), otp).subscribe({
      next: () => {
        this.isVerifyingEmail.set(false);
        this.profile.update(p => p ? { ...p, email: this.newEmail() } : p);
        this.emailChangeMsg.set('تم تغيير البريد الإلكتروني بنجاح ✓');
        this.emailOtpStep.set(false);
        setTimeout(() => this.closeEmailChange(), 2000);
      },
      error: (err) => {
        this.emailChangeError.set(err?.error?.message || 'الرمز غير صحيح');
        this.isVerifyingEmail.set(false);
      }
    });
  }
}
