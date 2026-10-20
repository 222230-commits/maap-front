import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, AdminBuyer, UsersResponse } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';

export const SUPER_ADMIN_EMAIL = 'hs350vae@gmail.com';

@Component({
  selector: 'app-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private router = inject(Router);

  isSuperAdmin = computed(() => {
    const email = this.authService.currentUser()?.email?.toLowerCase()?.trim();
    return email === SUPER_ADMIN_EMAIL;
  });

  isLoading = signal(true);
  error = signal('');
  activeTab = signal<'all' | 'active' | 'banned'>('all');
  roleFilter = signal<'all' | 'buyer' | 'seller'>('all');
  searchQuery = signal('');
  allUsers = signal<AdminBuyer[]>([]);

  // Pagination State
  currentPage = signal(1);
  lastPage = signal(1);
  totalUsers = signal(0);
  perPage = signal(50);
  rawCounts = signal<UsersResponse['counts'] | null>(null);

  selectedUser = signal<AdminBuyer | null>(null);
  showProfileModal = signal(false);
  showDeleteConfirm = signal<string | null>(null);
  showPromoteConfirm = signal<AdminBuyer | null>(null);
  successNotification = signal<string>('');
  isDeleting = signal(false);
  isToggling = signal<string | null>(null);
  isPromotingId = signal<string | null>(null);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  filteredUsers = computed(() => this.allUsers());

  pages = computed<number[]>(() => {
    const total = this.lastPage();
    const current = this.currentPage();
    if (total <= 1) return [];

    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    const list: number[] = [];
    for (let i = start; i <= end; i++) {
      list.push(i);
    }
    return list;
  });

  displayRange = computed(() => {
    const total = this.totalUsers();
    if (total === 0) return 'لا يوجد مستخدمون';
    const page = this.currentPage();
    const size = this.perPage();
    const from = (page - 1) * size + 1;
    const to = Math.min(page * size, total);
    return `عرض ${from} - ${to} من أصل ${total} مستخدم`;
  });

  countsSummary = computed(() => {
    const c = this.rawCounts();
    if (!c) {
      return {
        total: this.totalUsers(),
        buyers: null as number | null,
        sellers: null as number | null
      };
    }
    const parseCount = (val: unknown): number | null => {
      if (typeof val === 'number') return val;
      if (val && typeof val === 'object' && 'all' in val) {
        return Number((val as { all?: number }).all ?? 0);
      }
      return null;
    };

    return {
      total: parseCount(c.total_users) ?? this.totalUsers(),
      buyers: parseCount(c.buyers),
      sellers: parseCount(c.sellers)
    };
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(page: number = this.currentPage()): void {
    this.isLoading.set(true);
    this.error.set('');
    this.currentPage.set(page);

    const searchParam = this.searchQuery().trim() || undefined;

    this.adminService.getUsers(
      this.roleFilter(),
      this.activeTab(),
      searchParam,
      page,
      this.perPage()
    ).subscribe({
      next: (res) => {
        const raw = res.data as unknown;
        let list: AdminBuyer[] = [];
        let curPage = page;
        let lastPg = 1;
        let totalCount = 0;

        if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) {
          const paginated = raw as { data: AdminBuyer[]; current_page?: number; last_page?: number; total?: number; per_page?: number };
          list = paginated.data;
          curPage = paginated.current_page ?? page;
          lastPg = paginated.last_page ?? 1;
          totalCount = paginated.total ?? list.length;
        } else if (Array.isArray(raw)) {
          list = raw as AdminBuyer[];
          curPage = 1;
          lastPg = 1;
          totalCount = list.length;
        }

        this.allUsers.set(list);
        this.currentPage.set(curPage);
        this.lastPage.set(lastPg);
        this.totalUsers.set(totalCount);

        if (res.counts) {
          this.rawCounts.set(res.counts);
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'فشل تحميل المستخدمين');
        this.isLoading.set(false);
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage() || page === this.currentPage()) return;
    this.loadUsers(page);
  }

  changePerPage(size: number): void {
    if (this.perPage() === size) return;
    this.perPage.set(size);
    this.loadUsers(1);
  }

  changeTab(tab: 'all' | 'active' | 'banned'): void {
    this.activeTab.set(tab);
    this.loadUsers(1);
  }

  changeRole(role: 'all' | 'buyer' | 'seller'): void {
    this.roleFilter.set(role);
    this.loadUsers(1);
  }

  updateSearch(v: string): void {
    this.searchQuery.set(v);
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.loadUsers(1);
    }, 350);
  }

  clearSearch(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchQuery.set('');
    this.loadUsers(1);
  }

  openProfile(user: AdminBuyer): void {
    this.selectedUser.set(user);
    this.showProfileModal.set(true);
  }

  closeProfile(): void {
    this.showProfileModal.set(false);
  }

  loadBuyers(page: number = this.currentPage()): void {
    this.loadUsers(page);
  }

  toggleStatus(user: AdminBuyer): void {
    this.isToggling.set(user.id);
    const role = (user.role === 'seller') ? 'seller' : 'buyer';
    this.adminService.toggleUserStatus(user.id, role).subscribe({
      next: () => {
        this.isToggling.set(null);
        // تحديث الـ local state فوراً
        this.allUsers.update(users =>
          users.map(u => u.id === user.id
            ? {
                ...u,
                is_active: !u.is_active,
                status: (u.status === 'banned' || !u.is_active) ? 'active' : 'banned'
              }
            : u
          )
        );
        if (this.selectedUser()?.id === user.id) {
          this.selectedUser.update(u => u ? {
            ...u,
            is_active: !u.is_active,
            status: (u.status === 'banned' || !u.is_active) ? 'active' : 'banned'
          } : null);
        }
        // إعادة جلب البيانات من الـ API
        this.loadBuyers();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'فشل تغيير الحالة');
        this.isToggling.set(null);
      }
    });
  }

  confirmDelete(id: string): void {
    this.showDeleteConfirm.set(id);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(null);
  }

  openPromoteModal(user: AdminBuyer): void {
    this.showPromoteConfirm.set(user);
  }

  cancelPromote(): void {
    this.showPromoteConfirm.set(null);
  }

  confirmPromote(): void {
    if (!this.isSuperAdmin()) {
      this.error.set('عذراً، الترقية إلى رتبة مدير متاحة فقط للإدارة الرئيسية.');
      this.showPromoteConfirm.set(null);
      return;
    }

    const user = this.showPromoteConfirm();
    if (!user) return;

    this.isPromotingId.set(user.id);
    this.adminService.promoteToAdmin(user.id).subscribe({
      next: () => {
        this.isPromotingId.set(null);

        // إذا كان المستخدم تاجراً، نخزن تنبيه بوجوب تصفية المتجر
        const isSeller = user.role === 'seller' || !!user.shop;
        if (isSeller) {
          try {
            localStorage.setItem(`admin_must_delete_shop_${user.id}`, 'true');
            const sName = user.shop?.business_name || '';
            if (sName) {
              localStorage.setItem(`admin_shop_name_${user.id}`, sName);
            }
          } catch {}
        }
        // إعادة تعيين إشعار الترحيب كي تظهر له نافذة الترقية فور دخوله
        try {
          localStorage.removeItem(`has_seen_admin_welcome_${user.id}`);
        } catch {}

        this.showPromoteConfirm.set(null);
        this.showProfileModal.set(false);
        this.successNotification.set(`تمت ترقية ${user.full_name} إلى مدير نظام (Admin) بنجاح!`);
        setTimeout(() => this.successNotification.set(''), 4500);
        this.loadUsers();
      },
      error: (err) => {
        this.isPromotingId.set(null);
        this.showPromoteConfirm.set(null);
        this.error.set(err?.error?.message || 'فشلت عملية الترقية إلى مدير. يرجى المحاولة لاحقاً.');
      }
    });
  }

  goToAdmins(): void {
    this.router.navigate(['/admin/admins']);
  }

  deleteUser(id: string): void {
    this.isDeleting.set(true);
    this.adminService.deleteUser(id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteConfirm.set(null);
        this.loadUsers();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'فشل الحذف');
        this.isDeleting.set(false);
      }
    });
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-LY');
  }
}
