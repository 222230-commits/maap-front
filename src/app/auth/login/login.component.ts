import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  heroStats = { shops: 50, products: 500 };

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParams['email'];
    if (emailParam) {
      this.loginForm.patchValue({ email: emailParam });
    }
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;
    
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    try {
      const { email, password } = this.loginForm.value;
      await this.authService.login(email!, password!);
      // navigation تصير تلقائياً في الـ service
    } catch (err: any) {
      const msg = err?.error?.message || err?.error?.error || '';
      if (
        msg.includes('حظر') ||
        msg.includes('تجميد') ||
        msg.includes('موقوف') ||
        msg.includes('معطل') ||
        msg.includes('banned') ||
        msg.includes('inactive')
      ) {
        this.authService.handleBannedUser(msg);
        return;
      }
      this.errorMessage.set(msg || 'بيانات الدخول غير صحيحة');
    } finally {
      this.isLoading.set(false);
    }
  }
}
