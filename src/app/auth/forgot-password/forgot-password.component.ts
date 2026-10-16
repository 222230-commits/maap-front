import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  router = inject(Router);

  email = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  sent = signal(false);

  updateEmail(v: string) {
    this.email.set(v);
  }

  async onSubmit() {
    if (!this.email()) {
      this.errorMessage.set('أدخل بريدك الإلكتروني');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    try {
      await this.authService.forgotPassword(this.email());
      this.sent.set(true);
      // احفظ الإيميل للـ reset password
      localStorage.setItem('reset_email', this.email());
    } catch (err: any) {
      this.errorMessage.set(
        err?.error?.message || 'البريد الإلكتروني غير مسجل'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
