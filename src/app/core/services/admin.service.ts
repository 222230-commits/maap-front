import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardResponse {
  success: boolean;
  filter_applied: string;
  data: {
    top_cards: {
      buyers_count: number;
      sellers_count: number;
      products_count: number;
      orders_count: number;
      pending_applications_count: number;
      new_reports_count: number;
    };
    users_distribution: {
      buyers: number;
      sellers: number;
    };
    seller_applications_chart: {
      pending: { count: number; percentage: number };
      approved: { count: number; percentage: number };
      rejected: { count: number; percentage: number };
    };
    pending_applications_list: Application[];
    latest_reports_list: any[];
    recent_activities: {
      type: string;
      title: string;
      time_ago: string;
    }[];
    footer_counters: {
      total_users: number;
      approval_rate_percentage: number;
      pending_reports_count: number;
      active_shops_count: number;
    };
  };
}

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  avatar_url: string | null;
  phone_number: string;
  address: string;
  is_active: boolean;
  status?: 'active' | 'banned' | string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  email_verified: boolean;
  username?: string;
  // seller fields
  shop?: {
    id: string;
    business_name: string;
    is_active: boolean;
  };
}

/** @deprecated use AdminUser */
export type AdminBuyer = AdminUser;

export interface UsersResponse {
  success: boolean;
  filter_applied?: string;
  filters_applied?: {
    role?: string;
    status?: string;
    search?: string | null;
  };
  counts?: {
    buyers?: number | { all?: number; active?: number; banned?: number };
    sellers?: number | { all?: number; active?: number; banned?: number };
    total_users?: number | { all?: number; active?: number; banned?: number };
  };
  data: {
    current_page: number;
    data: AdminUser[];
    total: number;
    last_page: number;
    per_page?: number;
    from?: number;
    to?: number;
  };
}

/** @deprecated use UsersResponse */
export type BuyersResponse = UsersResponse;

export interface UserResponse {
  success: boolean;
  data: AdminUser;
}

/** @deprecated use UserResponse */
export type BuyerResponse = UserResponse;

export interface Application {
  id: string;
  business_name: string;
  business_description: string;
  business_logo_url: string | null;
  phone_number: string;
  email: string;
  business_address: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  user?: AdminBuyer;
}

export interface ApplicationsResponse {
  success: boolean;
  data: {
    current_page: number;
    data: Application[];
    total: number;
    last_page: number;
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl;

  buyers = signal<AdminBuyer[]>([]);

  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.BASE}/admin/dashboard`);
  }

  // GET /admin/buyers?role=all|buyer|seller&status=all|active|banned&search=&page=1&per_page=15
  getUsers(
    role: 'all' | 'buyer' | 'seller' = 'all',
    status: 'all' | 'active' | 'banned' = 'all',
    search?: string,
    page: number = 1,
    per_page: number = 15
  ): Observable<UsersResponse> {
    let params = new HttpParams()
      .set('role', role)
      .set('status', status)
      .set('page', page.toString())
      .set('per_page', per_page.toString());
    if (search && search.trim()) params = params.set('search', search.trim());
    return this.http.get<UsersResponse>(`${this.BASE}/admin/buyers`, { params }).pipe(
      tap((res) => {
        const raw = res.data as unknown;
        if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) {
          this.buyers.set((raw as any).data);
        } else if (Array.isArray(raw)) {
          this.buyers.set(raw as AdminBuyer[]);
        }
      })
    );
  }

  /** @deprecated استخدم getUsers بدلاً منه */
  getBuyers(status: 'all' | 'active' | 'banned' = 'all'): Observable<UsersResponse> {
    return this.getUsers('buyer', status);
  }

  loadBuyers(status: 'all' | 'active' | 'banned' = 'all'): Observable<UsersResponse> {
    return this.getBuyers(status);
  }

  // GET /admin/buyers/{id}
  getUser(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.BASE}/admin/buyers/${id}`);
  }

  /** @deprecated استخدم getUser بدلاً منه */
  getBuyer(id: string): Observable<UserResponse> {
    return this.getUser(id);
  }

  // GET /admin/applications?status=all|pending|approved|rejected
  getApplications(status: 'all' | 'pending' | 'approved' | 'rejected' = 'all'): Observable<ApplicationsResponse> {
    return this.http.get<ApplicationsResponse>(
      `${this.BASE}/admin/applications?status=${status}`
    );
  }

  // POST /admin/applications/{id}/approve
  approveApplication(id: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/admin/applications/${id}/approve`, {}
    );
  }

  // POST /admin/applications/{id}/reject
  rejectApplication(id: string, rejection_reason: string, admin_notes: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/admin/applications/${id}/reject`,
      { rejection_reason, admin_notes }
    );
  }

  // POST /admin/buyers/{id}/toggle-status
  toggleBuyerStatus(id: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/admin/buyers/${id}/toggle-status`, {}
    ).pipe(
      tap(() => {
        this.buyers.update(buyers =>
          buyers.map(b => b.id === id
            ? {
                ...b,
                is_active: !b.is_active,
                status: (b.status === 'banned' || !b.is_active) ? 'active' : 'banned'
              }
            : b
          )
        );
      })
    );
  }

  // POST /admin/sellers/{id}/toggle-status (يؤثر على التاجر + متجره)
  toggleSellerStatus(id: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/admin/sellers/${id}/toggle-status`, {}
    ).pipe(
      tap(() => {
        this.buyers.update(buyers =>
          buyers.map(b => b.id === id
            ? {
                ...b,
                is_active: !b.is_active,
                status: (b.status === 'banned' || !b.is_active) ? 'active' : 'banned'
              }
            : b
          )
        );
      })
    );
  }

  /** تبديل الحالة حسب الرول */
  toggleUserStatus(id: string, role: 'buyer' | 'seller'): Observable<ApiResponse> {
    return role === 'seller' ? this.toggleSellerStatus(id) : this.toggleBuyerStatus(id);
  }

  // PUT /admin/buyers/{id}
  updateUser(id: string, data: { full_name?: string; phone_number?: string; address?: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.BASE}/admin/buyers/${id}`, data);
  }

  // DELETE /admin/buyers/{id} — يطمس البيانات ويحفظ الطلبات
  deleteBuyer(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.BASE}/admin/buyers/${id}`);
  }

  // DELETE /admin/sellers/{id}/delete — يحذف التاجر
  deleteSeller(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.BASE}/admin/sellers/${id}/delete`);
  }

  /** @deprecated استخدم deleteBuyer أو deleteSeller */
  deleteUser(id: string): Observable<ApiResponse> {
    return this.deleteBuyer(id);
  }

  // GET /admin/buyers/{id}/orders
  getBuyerOrders(id: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/buyers/${id}/orders`);
  }

  // GET /admin/categories?type=tree — شجرة كاملة (مع الأبناء)
  getCategoriesTree(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/categories?type=tree`);
  }

  // GET /admin/categories?type=all — قائمة paginated
  getCategories(search?: string, page = 1): Observable<any> {
    let params = new HttpParams().set('type', 'all').set('page', String(page));
    if (search) params = params.set('search', search);
    return this.http.get<any>(`${this.BASE}/admin/categories`, { params });
  }

  // POST /admin/categories/store — حقل الاسم هو 'name' فقط (مو name_ar/name_en)
  createCategory(data: { name: string; parent_id?: string; image_url?: string }): Observable<any> {
    return this.http.post<any>(`${this.BASE}/admin/categories/store`, data);
  }

  // GET /admin/categories/{id}/show
  getCategory(id: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/categories/${id}/show`);
  }

  // PUT /admin/categories/{id}/update — حقل الاسم هو 'name' فقط
  updateCategory(id: string, data: { name?: string; parent_id?: string; image_url?: string }): Observable<any> {
    return this.http.put<any>(`${this.BASE}/admin/categories/${id}/update`, data);
  }

  // DELETE /admin/categories/{id}/delete — soft delete
  deleteCategory(id: string): Observable<any> {
    return this.http.delete<any>(`${this.BASE}/admin/categories/${id}/delete`);
  }

  // POST /admin/categories/{id}/restore — استعادة بعد الحذف
  restoreCategory(id: string): Observable<any> {
    return this.http.post<any>(`${this.BASE}/admin/categories/${id}/restore`, {});
  }

  // POST /admin/management/users/{id}/promote-to-admin
  promoteToAdmin(userId: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/admin/management/users/${userId}/promote-to-admin`, {}
    );
  }

  // ── Admin Category Endpoints ─────────────────────────────────

  // GET /admin/categories/{id}/show
  getAdminCategoryShow(id: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/categories/${id}/show`);
  }

  // POST /admin/categories/{id}/move-branch
  moveCategoryBranch(id: string, newParentId: string): Observable<any> {
    return this.http.post<any>(
      `${this.BASE}/admin/categories/${id}/move-branch`,
      { new_parent_id: newParentId }
    );
  }

  // POST /admin/categories/{id}/image
  uploadCategoryImage(id: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<any>(
      `${this.BASE}/admin/categories/${id}/image`, formData
    );
  }

  // POST /admin/categories/move-products
  moveCategoryProducts(fromCategoryId: string, toCategoryId: string): Observable<any> {
    return this.http.post<any>(
      `${this.BASE}/admin/categories/move-products`,
      { from_category_id: fromCategoryId, to_category_id: toCategoryId }
    );
  }

  // GET /admin/products?tab=all|active|blocked&status=published|unpublished&category_id=
  getAdminProducts(search?: string, categoryId?: string, status?: string, tab?: string): Observable<any> {
    let params = new HttpParams();
    if (search)     params = params.set('search',      search);
    if (categoryId) params = params.set('category_id', categoryId);
    if (status)     params = params.set('status',      status);
    if (tab)        params = params.set('tab',         tab);
    return this.http.get<any>(`${this.BASE}/admin/products`, { params });
  }

  // POST /admin/products/{id}/toggle-approval
  toggleProductApproval(id: string): Observable<any> {
    return this.http.post<any>(`${this.BASE}/admin/products/${id}/toggle-approval`, {});
  }

  // GET /admin/products/trending — أعلى 10 منتجات حسب المفضلة
  getTrendingProducts(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/products/trending`);
  }

  // POST /admin/products/move-products
  moveAdminProducts(data: { product_ids?: string[]; from_category_id?: string; to_category_id: string }): Observable<any> {
    return this.http.post<any>(`${this.BASE}/admin/products/move-products`, data);
  }

  // ── Admin Shops ───────────────────────────────────────────────

  // GET /admin/shops?status=&search=&per_page=&page=
  getShops(status?: string, search?: string, perPage = 100, page = 1): Observable<any> {
    let params = new HttpParams()
      .set('per_page', String(perPage))
      .set('page', String(page));
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    return this.http.get<any>(`${this.BASE}/admin/shops`, { params });
  }

  // GET /admin/shops/{id}
  getShop(id: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/shops/${id}`);
  }

  // POST /admin/shops/{id}/toggle-status — يؤثر على المتجر فقط (مو التاجر)
  toggleShopStatus(id: string): Observable<any> {
    return this.http.post<any>(`${this.BASE}/admin/shops/${id}/toggle-status`, {});
  }

  // GET /admin/shops/{id}/analytics
  getShopAnalytics(id: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/shops/${id}/analytics`);
  }

  // GET /admin/shops/{id}/orders
  getShopOrders(id: string, perPage = 15): Observable<any> {
    return this.http.get<any>(
      `${this.BASE}/admin/shops/${id}/orders?per_page=${perPage}`
    );
  }

  // DELETE /admin/shops/{id}/delete — الأخطر: يُخفّض رتبة التاجر ويحذف منتجاته
  deleteShop(id: string): Observable<any> {
    return this.http.delete<any>(`${this.BASE}/admin/shops/${id}/delete`);
  }

  // ── Admin Reports ──────────────────────────────────────────────

  // GET /admin/reports?type=product|shop|user|review&status=pending|resolved
  getReports(type?: string, status?: string): Observable<any> {
    let params = new HttpParams();
    if (type)   params = params.set('type',   type);
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${this.BASE}/admin/reports`, { params });
  }

  // POST /admin/reports/{id}/resolve
  resolveReport(id: string, data: {
    status: 'resolved' | 'dismissed';
    take_action?: boolean;
    admin_notes?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.BASE}/admin/reports/${id}/resolve`, data);
  }

  // ── Admin Shades ───────────────────────────────────────────────

  // GET /admin/shades
  getShades(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/shades`);
  }

  // GET /admin/shades/{id}/show
  getShade(id: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/shades/${id}/show`);
  }

  // POST /admin/shades/store
  createShade(data: { name: string }): Observable<any> {
    return this.http.post<any>(`${this.BASE}/admin/shades/store`, data);
  }

  // PUT /admin/shades/{id}/update
  updateShade(id: string, data: { name: string }): Observable<any> {
    return this.http.put<any>(`${this.BASE}/admin/shades/${id}/update`, data);
  }

  // DELETE /admin/shades/{id}/delete
  deleteShade(id: string): Observable<any> {
    return this.http.delete<any>(`${this.BASE}/admin/shades/${id}/delete`);
  }

  // ── Admin Colors ──────────────────────────────────────────────

  // GET /admin/colors
  getColors(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/colors`);
  }

  // GET /admin/colors/{id}/show
  getColor(id: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/colors/${id}/show`);
  }

  // POST /admin/colors/store
  createColor(data: { name: string; hex_code?: string }): Observable<any> {
    return this.http.post<any>(`${this.BASE}/admin/colors/store`, data);
  }

  // PUT /admin/colors/{id}/update
  updateColor(id: string, data: { name?: string; hex_code?: string }): Observable<any> {
    return this.http.put<any>(`${this.BASE}/admin/colors/${id}/update`, data);
  }

  // DELETE /admin/colors/{id}/delete
  deleteColor(id: string): Observable<any> {
    return this.http.delete<any>(`${this.BASE}/admin/colors/${id}/delete`);
  }

  // ── Admin Sizes ───────────────────────────────────────────────

  // GET /admin/sizes
  getSizes(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/sizes`);
  }

  // GET /admin/sizes/{id}/show
  getSize(id: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/sizes/${id}/show`);
  }

  // POST /admin/sizes/store
  createSize(data: { name: string }): Observable<any> {
    return this.http.post<any>(`${this.BASE}/admin/sizes/store`, data);
  }

  // PUT /admin/sizes/{id}/update
  updateSize(id: string, data: { name?: string }): Observable<any> {
    return this.http.put<any>(`${this.BASE}/admin/sizes/${id}/update`, data);
  }

  // DELETE /admin/sizes/{id}/delete
  deleteSize(id: string): Observable<any> {
    return this.http.delete<any>(`${this.BASE}/admin/sizes/${id}/delete`);
  }


  // ── Admin Ads ─────────────────────────────────────────────────

  // GET /admin/ads — جميع الإعلانات مجمّعة حسب position
  getAds(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/ads`);
  }

  // POST /admin/ads/store — خطوة 1: إنشاء بيانات الإعلان (بدون صورة)
  createAd(data: {
    title: string;
    target_type: 'external' | 'product' | 'shop' | 'category';
    is_active?: boolean;
    shop_id?: string | null;
    target_id?: string | null;
    target_url?: string | null;
    position?: string | null;
    sort_order?: number | null;
    start_date?: string | null;
    end_date?: string | null;
  }): Observable<any> {
    return this.http.post<any>(`${this.BASE}/admin/ads/store`, data);
  }

  // POST /admin/ads/{id}/image — خطوة 2: رفع صورة الإعلان (multipart)
  uploadAdImage(id: string, file: File): Observable<any> {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<any>(`${this.BASE}/admin/ads/${id}/image`, form);
  }

  // GET /admin/ads/{id}/show
  getAd(id: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/ads/${id}/show`);
  }

  // PUT /admin/ads/{id}/update — جميع الحقول اختيارية
  updateAd(id: string, data: {
    title?: string;
    target_type?: 'external' | 'product' | 'shop' | 'category';
    is_active?: boolean;
    shop_id?: string | null;
    target_id?: string | null;
    target_url?: string | null;
    position?: string | null;
    sort_order?: number | null;
    start_date?: string | null;
    end_date?: string | null;
  }): Observable<any> {
    return this.http.put<any>(`${this.BASE}/admin/ads/${id}/update`, data);
  }

  // DELETE /admin/ads/{id}/delete — حذف نهائي مع الصورة من Supabase
  deleteAd(id: string): Observable<any> {
    return this.http.delete<any>(`${this.BASE}/admin/ads/${id}/delete`);
  }

  // POST /admin/ads/{id}/toggle-status — is_active يأتي في الجذر (لا data)
  toggleAdStatus(id: string): Observable<{ success: boolean; message: string; is_active: boolean }> {
    return this.http.post<{ success: boolean; message: string; is_active: boolean }>(
      `${this.BASE}/admin/ads/${id}/toggle-status`, {}
    );
  }

  // GET /ads — إعلانات المنصة العامة (Public, no auth)
  getPublicAds(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/ads`);
  }
}
