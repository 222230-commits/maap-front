import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  isSaving    = signal(false);
  success     = signal('');
  error       = signal('');

  showCurrent = signal(false);
  showNew     = signal(false);
  showConfirm = signal(false);

  // ── touched: يصير true لما المستخدم يطلع من الحقل (blur) ──
  touched = {
    current:  signal(false),
    newPass:  signal(false),
    confirm:  signal(false),
  };

  form = {
    current_password:          signal(''),
    new_password:              signal(''),
    new_password_confirmation: signal(''),
  };

  // ── inline field errors ──
  currentError(): string {
    if (!this.touched.current()) return '';
    if (!this.form.current_password()) return 'كلمة المرور الحالية مطلوبة';
    return '';
  }

  newPassError(): string {
    if (!this.touched.newPass()) return '';
    if (!this.form.new_password()) return 'كلمة المرور الجديدة مطلوبة';
    if (this.form.new_password().length < 8) return 'يجب أن تكون 8 أحرف على الأقل';
    return '';
  }

  confirmError(): string {
    if (!this.touched.confirm()) return '';
    if (!this.form.new_password_confirmation()) return 'تأكيد كلمة المرور مطلوب';
    if (this.form.new_password() !== this.form.new_password_confirmation()) return 'كلمتا المرور غير متطابقتين';
    return '';
  }

  confirmOk(): boolean {
    return this.form.new_password_confirmation().length > 0
        && this.form.new_password() === this.form.new_password_confirmation()
        && this.form.new_password().length >= 8;
  }

  isFormValid(): boolean {
    return !this.currentError()
        && !this.newPassError()
        && !this.confirmError()
        && this.form.current_password().length > 0
        && this.form.new_password().length >= 8
        && this.confirmOk();
  }

  async submit(): Promise<void> {
    // touch all fields to show errors
    this.touched.current.set(true);
    this.touched.newPass.set(true);
    this.touched.confirm.set(true);

    this.error.set('');
    this.success.set('');

    if (!this.isFormValid()) return;

    this.isSaving.set(true);
    try {
      await this.authService.changePassword({
        current_password: this.form.current_password(),
        new_password: this.form.new_password(),
        new_password_confirmation: this.form.new_password_confirmation(),
      });
      this.success.set('تم تغيير كلمة المرور بنجاح');
      this.form.current_password.set('');
      this.form.new_password.set('');
      this.form.new_password_confirmation.set('');
      this.touched.current.set(false);
      this.touched.newPass.set(false);
      this.touched.confirm.set(false);
      setTimeout(() => this.router.navigate(['/profile']), 2000);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'فشل تغيير كلمة المرور');
    } finally {
      this.isSaving.set(false);
    }
  }
}
