import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  private authService = inject(AuthService);
  router = inject(Router);

  email = signal(localStorage.getItem('reset_email') ?? '');
  otpCode = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  showPassword = signal(false);

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    if (!this.email()) {
      this.router.navigate(['/auth/forgot-password']);
    }
  }

  updateOtp(v: string) {
    this.otpCode.set(v);
  }

  updatePassword(v: string) {
    this.newPassword.set(v);
  }

  updateConfirmPassword(v: string) {
    this.confirmPassword.set(v);
  }

  async onSubmit() {
    if (!this.otpCode() || !this.newPassword() || !this.confirmPassword()) {
      this.errorMessage.set('الرجاء تعبئة جميع الحقول');
      return;
    }
    
    if (this.newPassword() !== this.confirmPassword()) {
      this.errorMessage.set('كلمة المرور وتأكيدها غير متطابقتين');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    
    try {
      await this.authService.resetPassword({
        email: this.email(),
        otp_code: this.otpCode(),
        password: this.newPassword(),
        password_confirmation: this.confirmPassword()
      });
      
      localStorage.removeItem('reset_email');
      this.successMessage.set('تم تغيير كلمة المرور بنجاح!');
      
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 1500);
      
    } catch (err: any) {
      this.errorMessage.set(
        err?.error?.message || 'فشل تغيير كلمة المرور'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
