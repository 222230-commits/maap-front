import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-verify-otp',  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.scss'
})
export class VerifyOtpComponent implements OnInit {
  private authService = inject(AuthService);
  router = inject(Router);

  email = signal(localStorage.getItem('pending_email') ?? '');
  otpCode = signal('');
  isLoading = signal(false);
  isResending = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  resendCooldown = signal(0);

  ngOnInit(): void {
    if (!this.email()) {
      this.router.navigate(['/auth/register']);
    }
  }

  updateOtp(v: string) {
    this.otpCode.set(v);
  }

  async onVerify() {
    if (this.otpCode().length < 4) {
      this.errorMessage.set('أدخل رمز التحقق كاملاً');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    try {
      const res = await this.authService.verifyEmailOtp(
        this.email(), this.otpCode()
      );
      localStorage.setItem('pending_user_id', res.user_id ?? '');
      localStorage.removeItem('pending_email');
      this.router.navigate(['/auth/interests']);
    } catch (err: any) {
      this.errorMessage.set(
        err?.error?.message || 'الرمز غير صحيح، حاول مرة أخرى'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async onResend() {
    if (this.resendCooldown() > 0) return;
    
    this.isResending.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    
    try {
      await this.authService.resendEmailOtp(this.email());
      this.successMessage.set('تم إعادة إرسال الرمز بنجاح');
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
    } catch (err: any) {
      this.errorMessage.set('فشل إعادة الإرسال، حاول لاحقاً');
    } finally {
      this.isResending.set(false);
    }
  }
}
