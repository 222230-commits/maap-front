import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../core/services/auth.service';
import { AdminService, AdminBuyer } from '../../core/services/admin.service';

export const SUPER_ADMIN_EMAIL = 'hs350vae@gmail.com';

export interface AdminDisplayItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  isCurrentUser: boolean;
  joinDate?: string;
}

@Component({
  selector: 'app-admins',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admins.component.html',
  styleUrl: './admins.component.scss'
})
export class AdminsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private router = inject(Router);

  currentUser = signal<AuthUser | null>(null);
  adminsList = signal<AdminDisplayItem[]>([]);
  showAddModal = signal(false);

  // هل الأدمن الحالي هو الأدمن الأصلي الوحيد المخول بالترقية؟
  isSuperAdmin = computed(() => {
    const email = this.currentUser()?.email?.toLowerCase()?.trim();
    return email === SUPER_ADMIN_EMAIL;
  });

  // وضع النافذة: 'existing' = اختيار مستخدم مسجل مسبقاً، 'new' = إنشاء حساب مدير جديد
  modalMode = signal<'existing' | 'new'>('existing');

  // البحث واختيار المستخدمين الموجودين
  userSearchQuery = signal('');
  searchResults = signal<AdminBuyer[]>([]);
  isSearchingUsers = signal(false);
  selectedUserToPromote = signal<AdminBuyer | null>(null);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // حالة المعالج متعدد الخطوات
  currentStep = signal<1 | 2 | 3>(1);
  isLoading = signal(false);
  isResending = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  resendCooldown = signal(0);
  showPassword = signal(false);

  registeredEmail = signal('');
  promotedAdminName = signal('');
  promotedAdminEmail = signal('');
  promotedHasShop = signal(false);
  promotedShopName = signal('');
  otpCode = signal('');

  adminForm = this.fb.group({
    full_name: ['', [
      Validators.required,
      Validators.pattern(/^\S+\s+\S+/) // اسمين على الأقل
    ]],
    username: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.pattern(/^\S+$/) // بدون مسافات
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
        ? null : { mismatch: true };
    }
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.currentUser.set(user);

    const list: AdminDisplayItem[] = [];

    // الأدمن الأول والأصلي دائماً في أعلى القائمة
    const isCurrentOriginal = user?.email?.toLowerCase()?.trim() === SUPER_ADMIN_EMAIL;
    list.push({
      id: isCurrentOriginal ? (user?.id || 'super-admin-01') : 'super-admin-01',
      name: isCurrentOriginal ? (user?.full_name || 'هدى سليمان الشريف (void)') : 'هدى سليمان الشريف (void)',
      email: SUPER_ADMIN_EMAIL,
      role: 'المدير العام والمسؤول الأول (Super Admin)',
      isSuperAdmin: true,
      isCurrentUser: isCurrentOriginal,
      joinDate: '2026/01/01'
    });

    // إذا كان المستخدم الحالي مديراً جديداً غير الأصلي، نضيفه إلى القائمة ليظهر في موقعه
    if (user && !isCurrentOriginal) {
      list.push({
        id: user.id,
        name: user.full_name || 'مدير نظام',
        email: user.email || '',
        role: 'مدير نظام معتمد (Admin)',
        isSuperAdmin: false,
        isCurrentUser: true,
        joinDate: new Date().toLocaleDateString('ar-LY')
      });
    }

    // جلب باقي المدراء الذين تمت ترقيتهم سابقاً
    try {
      const stored = localStorage.getItem('promoted_admins');
      if (stored) {
        const parsed: AdminDisplayItem[] = JSON.parse(stored);
        parsed.forEach(p => {
          if (!list.some(item => item.email.toLowerCase() === p.email.toLowerCase())) {
            list.push(p);
          }
        });
      }
    } catch {
      // ignore
    }

    this.adminsList.set(list);
  }

  openAddModal(mode: 'existing' | 'new' = 'existing'): void {
    if (!this.isSuperAdmin()) {
      alert('عذراً، صلاحية ترقية وإضافة مدراء مخصصة حصرياً للمدير العام الأول للمنصة.');
      return;
    }
    this.modalMode.set(mode);
    this.adminForm.reset();
    this.currentStep.set(1);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.otpCode.set('');
    this.userSearchQuery.set('');
    this.searchResults.set([]);
    this.selectedUserToPromote.set(null);
    this.promotedHasShop.set(false);
    this.promotedShopName.set('');
    this.showAddModal.set(true);

    if (mode === 'existing') {
      this.loadInitialUsers();
    }
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  switchModalMode(mode: 'existing' | 'new'): void {
    this.modalMode.set(mode);
    this.errorMessage.set('');
    this.successMessage.set('');
    if (mode === 'existing' && this.searchResults().length === 0) {
      this.loadInitialUsers();
    }
  }

  loadInitialUsers(): void {
    this.isSearchingUsers.set(true);
    this.adminService.getUsers('all', 'active', undefined, 1, 10).subscribe({
      next: (res) => {
        const raw = res.data as unknown;
        let list: AdminBuyer[] = [];
        if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) {
          list = (raw as any).data;
        } else if (Array.isArray(raw)) {
          list = raw as AdminBuyer[];
        }
        // استبعاد الأدمن الأصلي من قائمة المرشحين للترقية
        this.searchResults.set(list.filter(u => u.email?.toLowerCase() !== SUPER_ADMIN_EMAIL));
        this.isSearchingUsers.set(false);
      },
      error: () => this.isSearchingUsers.set(false)
    });
  }

  onSearchUsers(query: string): void {
    this.userSearchQuery.set(query);
    if (this.searchTimer) clearTimeout(this.searchTimer);

    this.searchTimer = setTimeout(() => {
      this.isSearchingUsers.set(true);
      const q = query.trim() || undefined;
      this.adminService.getUsers('all', 'active', q, 1, 15).subscribe({
        next: (res) => {
          const raw = res.data as unknown;
          let list: AdminBuyer[] = [];
          if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) {
            list = (raw as any).data;
          } else if (Array.isArray(raw)) {
            list = raw as AdminBuyer[];
          }
          this.searchResults.set(list.filter(u => u.email?.toLowerCase() !== SUPER_ADMIN_EMAIL));
          this.isSearchingUsers.set(false);
        },
        error: () => this.isSearchingUsers.set(false)
      });
    }, 300);
  }

  selectUserToPromote(user: AdminBuyer): void {
    this.selectedUserToPromote.set(user);
    this.errorMessage.set('');
  }

  // ترقية مستخدم مسجل مسبقاً (دون سؤاله عن الباسوورد أو الهاتف)
  promoteSelectedUser(): void {
    const user = this.selectedUserToPromote();
    if (!user) return;

    const hasShop = user.role === 'seller' || !!user.shop;
    const shopName = user.shop?.business_name || '';

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.adminService.promoteToAdmin(user.id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.promotedAdminName.set(user.full_name);
        this.promotedAdminEmail.set(user.email);
        this.promotedHasShop.set(hasShop);
        this.promotedShopName.set(shopName);

        // تخزين إشعار حذف المتجر للحساب
        if (hasShop) {
          localStorage.setItem('admin_must_delete_shop_' + user.id, 'true');
          localStorage.setItem('admin_shop_name_' + user.id, shopName);
        }
        // إتاحة نافذة الترحيب بالترقية عند دخوله القادم
        localStorage.removeItem('has_seen_admin_welcome_' + user.id);

        this.currentStep.set(3); // الانتقال لشاشة النجاح

        const newAdminItem: AdminDisplayItem = {
          id: user.id,
          name: user.full_name,
          email: user.email,
          role: 'مدير نظام معتمد (Admin)',
          isSuperAdmin: false,
          isCurrentUser: false,
          joinDate: new Date().toLocaleDateString('ar-LY')
        };

        this.adminsList.update(list => [...list, newAdminItem]);
        try {
          const stored = localStorage.getItem('promoted_admins');
          const arr = stored ? JSON.parse(stored) : [];
          arr.push(newAdminItem);
          localStorage.setItem('promoted_admins', JSON.stringify(arr));
        } catch {
          // ignore
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'فشلت عملية الترقية، يرجى المحاولة مرة أخرى.');
      }
    });
  }

  // الخطوة 1 (للحساب الجديد)
  async onSubmitStep1(): Promise<void> {
    if (this.adminForm.invalid) {
      this.errorMessage.set('يرجى ملء جميع الحقول المطلوبة بشكل صحيح.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const v = this.adminForm.value;
      await this.authService.registerBuyer({
        full_name: v.full_name!,
        username: v.username!,
        email: v.email!,
        password: v.password!,
        password_confirmation: v.password_confirmation!,
        phone_number: v.phone_number!,
        address: v.address!
      });

      this.registeredEmail.set(v.email!);
      this.promotedAdminName.set(v.full_name!);
      this.promotedAdminEmail.set(v.email!);
      this.currentStep.set(2);
      this.resendCooldown.set(60);
      this.startCooldownTimer();
    } catch (err: any) {
      const msg = err?.error?.message;
      this.errorMessage.set(msg || 'فشل تسجيل حساب المدير، يرجى المحاولة مرة أخرى.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // الخطوة 2 (للحساب الجديد): التحقق والترقية
  async onSubmitStep2(): Promise<void> {
    if (this.otpCode().trim().length < 4) {
      this.errorMessage.set('يرجى إدخال رمز التحقق كاملاً (4 أرقام).');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const verifyRes = await this.authService.verifyEmailOtp(
        this.registeredEmail(),
        this.otpCode().trim()
      );

      const userId = verifyRes.user_id || (verifyRes as any)?.user?.id || (verifyRes as any)?.id;
      if (!userId) {
        throw new Error('لم يتم العثور على معرّف المستخدم الناتج عن التحقق.');
      }

      this.adminService.promoteToAdmin(userId).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.currentStep.set(3);

          const newAdminItem: AdminDisplayItem = {
            id: userId,
            name: this.promotedAdminName(),
            email: this.promotedAdminEmail(),
            role: 'مدير نظام معتمد (Admin)',
            isSuperAdmin: false,
            isCurrentUser: false,
            joinDate: new Date().toLocaleDateString('ar-LY')
          };

          this.adminsList.update(list => [...list, newAdminItem]);
          try {
            const stored = localStorage.getItem('promoted_admins');
            const arr = stored ? JSON.parse(stored) : [];
            arr.push(newAdminItem);
            localStorage.setItem('promoted_admins', JSON.stringify(arr));
          } catch {
            // ignore
          }
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            err?.error?.message || 'تم التحقق من الحساب ولكن فشلت الترقية إلى مدير. يرجى المحاولة مجدداً.'
          );
        }
      });
    } catch (err: any) {
      this.isLoading.set(false);
      this.errorMessage.set(err?.error?.message || err?.message || 'رمز التحقق غير صحيح، يرجى التأكد وإعادة المحاولة.');
    }
  }

  async onResendOtp(): Promise<void> {
    if (this.resendCooldown() > 0 || this.isResending()) return;

    this.isResending.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.authService.resendEmailOtp(this.registeredEmail());
      this.successMessage.set('تمت إعادة إرسال رمز التحقق بنجاح إلى البريد الإلكتروني.');
      this.resendCooldown.set(120);
      this.startCooldownTimer();
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'فشل إعادة إرسال الرمز، يرجى المحاولة لاحقاً.');
    } finally {
      this.isResending.set(false);
    }
  }

  private startCooldownTimer(): void {
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

  goToDashboard(): void {
    this.closeAddModal();
    this.router.navigate(['/admin']);
  }
}
