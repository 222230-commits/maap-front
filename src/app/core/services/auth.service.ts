import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  is_active?: boolean;
  status?: string;
  ban_reason?: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  user_id?: string;
  application_id?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  access_token: string;
  token_type: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly BASE = environment.apiUrl;

  currentUser = signal<AuthUser | null>(null);
  isLoggedIn = computed(() => !!this.currentUser());
  isBanned = signal<boolean>(false);
  banReason = signal<string>('');

  role = computed(() => {
    const r = (this.currentUser()?.role as string)?.toLowerCase();
    if (r === 'seller' || r === 'merchant') return 'merchant';
    if (r === 'admin') return 'admin';
    if (r === 'buyer') return 'buyer';
    return 'guest';
  });

  constructor() {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.id && user?.role) {
          this.currentUser.set(user);
          // فقط user status = banned يمنع الدخول؛ shop status = suspended لا يؤثر على المشتري
          if (user.status === 'banned') {
            this.handleBannedUser(user.ban_reason);
          } else {
            this.isBanned.set(false);
          }
        }
      }
    } catch { localStorage.clear(); }

    if (localStorage.getItem('access_token')) {
      this.refreshUser();
    }
  }

  handleBannedUser(reason?: string): void {
    this.isBanned.set(true);
    if (reason) this.banReason.set(reason);
    const cur = this.currentUser();
    if (cur) {
      const updated = { ...cur, is_active: false, status: 'banned', ban_reason: reason || this.banReason() };
      localStorage.setItem('user', JSON.stringify(updated));
      this.currentUser.set(updated);
    }
  }

  async refreshUser(): Promise<AuthUser | null> {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const res = await firstValueFrom(
        this.http.get<any>(`${this.BASE}/user/profile/Show`)
      );
      const profile = res?.data ?? res;
      if (profile && profile.id) {
        const role = (profile.role === 'merchant' ? 'seller' : profile.role);
        // فقط user status = banned يمنع الدخول، إيقاف المتجر لا يؤثر على المشتري
        const isUserBanned = profile.status === 'banned';
        const updatedUser: AuthUser = {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          role: role,
          is_active: !isUserBanned,
          status: profile.status
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.currentUser.set(updatedUser);

        if (isUserBanned) {
          this.handleBannedUser(profile.ban_reason || 'تم إيقاف حسابك من قِبل إدارة المنصة لمخالفة الشروط والأحكام.');
        } else {
          this.isBanned.set(false);
        }

        return updatedUser;
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        const rawMsg = err?.error?.message || '';
        const msg = (typeof rawMsg === 'string' ? rawMsg : '').toLowerCase();
        const isShopRelated = msg.includes('متجر') || msg.includes('shop');
        if (!isShopRelated && (msg.includes('حظر') || msg.includes('user banned') || msg.includes('banned'))) {
          this.handleBannedUser(rawMsg || 'تم إيقاف حسابك من قِبل إدارة المنصة.');
        }
      }
    }
    return this.currentUser();
  }

  updateUserRole(newRole: string): void {
    const cur = this.currentUser();
    if (!cur) return;
    const role = (newRole === 'merchant' ? 'seller' : newRole) as any;
    const updated: AuthUser = { ...cur, role };
    localStorage.setItem('user', JSON.stringify(updated));
    this.currentUser.set(updated);
  }

  // 1) Register Buyer
  async registerBuyer(data: {
    full_name: string;
    username: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone_number: string;
    address: string;
  }): Promise<ApiResponse> {
    return firstValueFrom(
      this.http.post<ApiResponse>(`${this.BASE}/RegisterBuyer`, data)
    );
  }

  // 2) Resend OTP
  async resendEmailOtp(email: string): Promise<ApiResponse> {
    return firstValueFrom(
      this.http.post<ApiResponse>(`${this.BASE}/ResendEmailOtp`, { email })
    );
  }

  // 3) Verify Buyer OTP
  async verifyEmailOtp(email: string, otp_code: string): Promise<ApiResponse> {
    return firstValueFrom(
      this.http.post<ApiResponse>(`${this.BASE}/VerifyEmailOtp`,
        { email, otp_code })
    );
  }

  // 4) Save Interests
  async saveInterests(user_id: string, category_ids: string[]): Promise<ApiResponse> {
    return firstValueFrom(
      this.http.post<ApiResponse>(`${this.BASE}/SaveInterests`,
        { user_id, category_ids })
    );
  }

  // 5) Forgot Password
  async forgotPassword(email: string): Promise<ApiResponse> {
    return firstValueFrom(
      this.http.post<ApiResponse>(`${this.BASE}/ForgotPassword`, { email })
    );
  }

  // 6) Reset Password
  async resetPassword(data: {
    email: string;
    otp_code: string;
    password: string;
    password_confirmation: string;
  }): Promise<ApiResponse> {
    return firstValueFrom(
      this.http.post<ApiResponse>(`${this.BASE}/ResetPassword`, data)
    );
  }

  // 7) Register Seller
  async registerSeller(data: {
    business_name: string;
    business_description: string;
    business_logo_url: string;
    category_ids: string[];
    phone_number: string;
    business_address: string;
    email: string;
    terms_accepted: boolean;
  }): Promise<ApiResponse> {
    return firstValueFrom(
      this.http.post<ApiResponse>(`${this.BASE}/RegisterSeller`, data)
    );
  }

  // 8) Verify Seller OTP
  async verifySellerOtp(email: string, otp_code: string): Promise<ApiResponse> {
    return firstValueFrom(
      this.http.post<ApiResponse>(`${this.BASE}/VerifySellerEmailOtp`,
        { email, otp_code })
    );
  }

  // 9) Login
  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.BASE}/Login`,
        { email, password })
    );
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.currentUser.set(res.user);

    if (res.user.is_active === false || res.user.status === 'banned') {
      this.handleBannedUser(res.user.ban_reason || 'تم إيقاف حسابك من قِبل إدارة المنصة.');
      return;
    }

    // إذا كان الحساب نشطاً، يتم تصفير أي حالة حظر قديمة
    this.isBanned.set(false);
    this.banReason.set('');

    const role = res.user.role;
    if (role === 'admin') {
      // Admin يجب أن يسجل دخول من صفحة خاصة
      // لكن لو دخل من هنا نوجهه للـ admin
      this.router.navigate(['/admin']);
    } else if (role === 'seller') {
      this.router.navigate(['/merchant']);
    } else {
      this.router.navigate(['/']).then(() => {
        window.location.href = '/';
      });
    }
  }

  // POST /admin/login
  // Body: { email, password }
  // Response: {
  //   success: true,
  //   message: "تم تسجيل دخول المدير بنجاح",
  //   access_token: "token",
  //   token_type: "Bearer",
  //   user: { id, full_name, email, role: "admin" }
  // }
  // مهم: endpoint مختلف تماماً عن /Login العادي
  async adminLogin(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(
        `${this.BASE}/admin/login`,
        { email, password }
      )
    );
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.currentUser.set(res.user);
    // Admin دائماً يروح للـ admin dashboard
    this.router.navigate(['/admin']);
  }

  // 10) Logout
  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<ApiResponse>(`${this.BASE}/Logout`, {})
      );
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      this.currentUser.set(null);
      this.isBanned.set(false);
      this.banReason.set('');
      this.router.navigate(['/']);
    }
  }

  // 11) Change Password
  async changePassword(data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<ApiResponse> {
    return firstValueFrom(
      this.http.post<ApiResponse>(`${this.BASE}/ChangePassword`, data)
    );
  }

  sendPhoneOtp(phone_number: string): Observable<any> {
    return this.http.post<any>(`${this.BASE}/Phone/SendOtp`, { phone_number });
  }

  verifyPhoneOtp(phone_number: string, otp_code: string): Observable<any> {
    return this.http.post<any>(`${this.BASE}/Phone/VerifyOtp`, { phone_number, otp_code });
  }
}
