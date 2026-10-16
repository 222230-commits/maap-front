import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AdminMockService {

  stats = signal({
    totalBuyers: 156,
    totalMerchants: 23,
    totalShops: 21,
    totalProducts: 89,
    pendingApplications: 4,
    newReports: 7,
    bannedAccounts: 3,
    totalOrders: 234
  });

  users = signal<AdminUser[]>([
    { id: 1, name: 'Void Cat ', email: 'void@test.com',
      role: 'buyer', status: 'active', 
      joinDate: '2024-01-15', ordersCount: 12 },
    { id: 2, name: 'Casa', email: 'casa@test.com',
      role: 'buyer', status: 'active',
      joinDate: '2024-01-20', ordersCount: 5 },
    { id: 3, name: 'Golm', email: 'golm@test.com',
      role: 'buyer', status: 'banned',
      joinDate: '2024-02-01', ordersCount: 0 },
    { id: 4, name: 'Hex', email: 'merchant@test.com',
      role: 'merchant', status: 'active',
      joinDate: '2024-01-01', ordersCount: 0 },
    { id: 5, name: 'Fox', email: 'nour@test.com',
      role: 'merchant', status: 'active',
      joinDate: '2024-02-10', ordersCount: 0 }
  ]);

  applications = signal<AdminApplication[]>([
    { id: 1, userId: 10, ownerName: 'سارة ناجي',
      businessName: 'متجر العسل الليبي',
      description: 'متخصصون في العسل الجبلي الطبيعي',
      categories: ['الأطعمة والمأكولات'],
      socialLinks: { instagram: 'honey_libya', facebook: '',
                     tiktok: '', snapchat: '' },
      phone: '0911111111', email: 'honey@test.com',
      agreedToTerms: true, status: 'pending',
      adminNote: '', createdAt: '2024-06-01' },
    { id: 2, userId: 11, ownerName: 'نور الهدى',
      businessName: 'أزياء ليبيا',
      description: 'أحدث صيحات الموضة المحلية',
      categories: ['الأزياء والموضة'],
      socialLinks: { instagram: 'libya_fashion', facebook: 'libyafashion',
                     tiktok: '', snapchat: '' },
      phone: '0922222222', email: 'fashion@test.com',
      agreedToTerms: true, status: 'pending',
      adminNote: '', createdAt: '2024-06-03' },
    { id: 3, userId: 12, ownerName: 'عائشة علي',
      businessName: 'الأشغال اليدوية',
      description: 'منتجات يدوية تراثية ليبية',
      categories: ['الأشغال اليدوية', 'جمال وعناية'],
      socialLinks: { instagram: '', facebook: 'handmade_ly',
                     tiktok: 'handmade_ly', snapchat: '' },
      phone: '0933333333', email: 'handmade@test.com',
      agreedToTerms: true, status: 'approved',
      adminNote: 'تمت الموافقة — متجر ممتاز',
      createdAt: '2024-05-20' },
    { id: 4, userId: 13, ownerName: 'أم محمد',
      businessName: 'مطبخ أم محمد',
      description: 'أكلات ليبية تقليدية',
      categories: ['الأطعمة والمأكولات'],
      socialLinks: { instagram: 'om_mohamed', facebook: '',
                     tiktok: '', snapchat: '' },
      phone: '0944444444', email: 'kitchen@test.com',
      agreedToTerms: true, status: 'rejected',
      adminNote: 'البيانات غير مكتملة — يرجى إعادة التقديم',
      createdAt: '2024-05-15' }
  ]);

  reports = signal<AdminReport[]>([
    { id: 1, reportedBy: 1, reporterName: 'أحمد محمد',
      targetType: 'product', targetId: 5,
      targetName: 'منتج مجهول المصدر',
      reason: 'المنتج لا يطابق الوصف',
      status: 'pending', createdAt: '2024-06-10' },
    { id: 2, reportedBy: 2, reporterName: 'فاطمة خالد',
      targetType: 'shop', targetId: 3,
      targetName: 'متجر الإلكترونيات',
      reason: 'التاجر لا يرد على الطلبات',
      status: 'pending', createdAt: '2024-06-11' },
    { id: 3, reportedBy: 4, reporterName: 'مريم حسن',
      targetType: 'user', targetId: 3,
      targetName: 'خالد سالم',
      reason: 'سلوك مسيء في التعليقات',
      status: 'resolved', createdAt: '2024-06-05' }
  ]);

  categories = signal<AdminCategory[]>([
    { id: 1, name: 'beauty', nameAr: 'جمال وعناية',
      icon: 'fas fa-spa', productsCount: 34, isActive: true },
    { id: 2, name: 'food', nameAr: 'الأطعمة والمأكولات',
      icon: 'fas fa-utensils', productsCount: 28, isActive: true },
    { id: 3, name: 'handmade', nameAr: 'الأشغال اليدوية',
      icon: 'fas fa-hands', productsCount: 15, isActive: true },
    { id: 4, name: 'fashion', nameAr: 'الأزياء والموضة',
      icon: 'fas fa-tshirt', productsCount: 12, isActive: true }
  ]);

  seasons = signal<AdminSeason[]>([
    { id: 1, name: 'موسم التخرج',
      startDate: '2026-05-01', endDate: '2026-07-31',
      categories: ['fashion', 'handmade'],
      message: 'موسم التخرج قادم! ارتفعت المبيعات 340% العام الماضي',
      expectedGrowth: 340, isActive: true,
      bannerText: 'تسوق هدايا التخرج', bannerColor: '#522B5B' },
    { id: 2, name: 'رمضان الخير',
      startDate: '2026-02-28', endDate: '2026-03-30',
      categories: ['food', 'handmade'],
      message: 'استعد لرمضان! زيادة الطلب على المأكولات والهدايا',
      expectedGrowth: 280, isActive: false,
      bannerText: 'عروض رمضان', bannerColor: '#854F6C' }
  ]);

  admins = signal<AdminAccount[]>([
    { id: 1, name: 'مدير النظام', email: 'admin@test.com',
      isSuperAdmin: true, joinDate: '2024-01-01',
      permissions: {
        manageApplications: true,
        manageUsers: true,
        manageReports: true,
        manageCategories: true,
        manageSeasons: true,
        manageAdmins: true
      }
    }
  ]);

  recentActivity = signal<AdminActivity[]>([
    { id: 1, type: 'application',
      message: 'طلب جديد من متجر العسل الليبي',
      time: 'منذ 10 دقائق' },
    { id: 2, type: 'report',
      message: 'بلاغ جديد على منتج مجهول المصدر',
      time: 'منذ ساعة' },
    { id: 3, type: 'user',
      message: 'مستخدم جديد سجّل في المنصة',
      time: 'منذ 3 ساعات' }
  ]);

  // Computed
  pendingApplications = computed(() =>
    this.applications().filter(a => a.status === 'pending'));
  pendingReports = computed(() =>
    this.reports().filter(r => r.status === 'pending'));
  buyers = computed(() =>
    this.users().filter(u => u.role === 'buyer'));
  merchants = computed(() =>
    this.users().filter(u => u.role === 'merchant'));

  // Methods
  approveApplication(id: number, note: string): void {
    this.applications.update(apps =>
      apps.map(a => a.id === id ?
        { ...a, status: 'approved' as const, adminNote: note } : a));
    this.stats.update(s => ({
      ...s,
      pendingApplications: Math.max(0, s.pendingApplications - 1),
      totalMerchants: s.totalMerchants + 1,
      totalShops: s.totalShops + 1
    }));
  }

  rejectApplication(id: number, note: string): void {
    this.applications.update(apps =>
      apps.map(a => a.id === id ?
        { ...a, status: 'rejected' as const, adminNote: note } : a));
    this.stats.update(s => ({
      ...s, pendingApplications: Math.max(0, s.pendingApplications - 1)
    }));
  }

  toggleUserStatus(id: number): void {
    this.users.update(users =>
      users.map(u => u.id === id ? {
        ...u,
        status: u.status === 'active' ? 'banned' as const : 'active' as const
      } : u));
  }

  resolveReport(id: number): void {
    this.reports.update(reports =>
      reports.map(r => r.id === id ?
        { ...r, status: 'resolved' as const } : r));
    this.stats.update(s => ({
      ...s, newReports: Math.max(0, s.newReports - 1)
    }));
  }

  dismissReport(id: number): void {
    this.reports.update(reports =>
      reports.map(r => r.id === id ?
        { ...r, status: 'dismissed' as const } : r));
  }

  addCategory(cat: Omit<AdminCategory, 'id' | 'productsCount'>): void {
    this.categories.update(cats => [
      ...cats, { ...cat, id: Date.now(), productsCount: 0 }
    ]);
  }

  updateCategory(id: number, data: Partial<AdminCategory>): void {
    this.categories.update(cats =>
      cats.map(c => c.id === id ? { ...c, ...data } : c));
  }

  deleteCategory(id: number): void {
    this.categories.update(cats => cats.filter(c => c.id !== id));
  }

  toggleSeason(id: number): void {
    this.seasons.update(seasons =>
      seasons.map(s => s.id === id ?
        { ...s, isActive: !s.isActive } : s));
  }

  addSeason(season: Omit<AdminSeason, 'id'>): void {
    this.seasons.update(s => [...s, { ...season, id: Date.now() }]);
  }

  addAdmin(admin: Omit<AdminAccount, 'id'>): void {
    this.admins.update(a => [...a, { ...admin, id: Date.now() }]);
  }
}

// Interfaces
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'buyer' | 'merchant';
  status: 'active' | 'banned';
  joinDate: string;
  ordersCount: number;
}

export interface AdminApplication {
  id: number;
  userId: number;
  ownerName: string;
  businessName: string;
  description: string;
  categories: string[];
  socialLinks: {
    instagram: string;
    facebook: string;
    tiktok: string;
    snapchat: string;
  };
  phone: string;
  email: string;
  agreedToTerms: boolean;
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string;
  createdAt: string;
}

export interface AdminReport {
  id: number;
  reportedBy: number;
  reporterName: string;
  targetType: 'product' | 'shop' | 'user';
  targetId: number;
  targetName: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface AdminCategory {
  id: number;
  name: string;
  nameAr: string;
  icon: string;
  productsCount: number;
  isActive: boolean;
}

export interface AdminSeason {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  categories: string[];
  message: string;
  expectedGrowth: number;
  isActive: boolean;
  bannerText: string;
  bannerColor: string;
}

export interface AdminAccount {
  id: number;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  joinDate: string;
  permissions: {
    manageApplications: boolean;
    manageUsers: boolean;
    manageReports: boolean;
    manageCategories: boolean;
    manageSeasons: boolean;
    manageAdmins: boolean;
  };
}

export interface AdminActivity {
  id: number;
  type: 'application' | 'report' | 'user' | 'category';
  message: string;
  time: string;
}
