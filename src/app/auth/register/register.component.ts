import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    full_name: ['', [
      Validators.required,
      Validators.pattern(/^\S+\s+\S+/)  // اسمين على الأقل
    ]],
    username: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.pattern(/^\S+$/)  // بدون مسافات
    ]],
    email: ['', [Validators.required, Validators.email]],
    phone_number: ['', [
      Validators.required,
      Validators.pattern(/^(091|092|093|094)\d{7}$/)
    ]],
    address: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', Validators.required]
  }, {
    validators: (g) => {
      return g.get('password')?.value === g.get('password_confirmation')?.value
        ? null : { mismatch: true }
    }
  });

  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  async onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const v = this.registerForm.value;
      await this.authService.registerBuyer({
        full_name: v.full_name!,
        username: v.username!,
        email: v.email!,
        password: v.password!,
        password_confirmation: v.password_confirmation!,
        phone_number: v.phone_number!,
        address: v.address!
      });
      
      localStorage.setItem('pending_email', v.email!);
      this.router.navigate(['/auth/verify-otp']);
    } catch (err: any) {
      const msg = err?.error?.message;
      this.errorMessage.set(msg || 'حدث خطأ أثناء التسجيل');
    } finally {
      this.isLoading.set(false);
    }
  }
}
