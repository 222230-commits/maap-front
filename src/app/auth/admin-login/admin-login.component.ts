import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',
  imports: [RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss'
})
export class AdminLoginComponent {
  private authService = inject(AuthService);
  public router = inject(Router);

  email = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  async onSubmit(): Promise<void> {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('أدخل البريد الإلكتروني وكلمة المرور');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.authService.adminLogin(
        this.email(), this.password()
      );
      // navigation تصير تلقائياً في الـ service
    } catch (err: any) {
      this.errorMessage.set(
        err?.error?.message || 'بيانات الدخول غير صحيحة'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
