import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WishlistImage {
  id: number;
  color_id: number | null;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface WishlistItem {
  id: string | number;
  shop_id: string | number;
  category_id: string | number;
  title: string;
  slug: string;
  description: string;
  price: string;
  compare_at_price: string;
  stock: number;
  favorited_at: string;
  reviews_count: number;
  average_rating: string;
  images: WishlistImage[];
}

export interface WishlistPagination {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
}

export interface WishlistResponse {
  success: boolean;
  pagination: WishlistPagination;
  data: WishlistItem[];
}

export interface ToggleResponse {
  success: boolean;
  action: 'added' | 'removed';
  message: string;
}

export interface DynamicCategory {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
  is_leaf: boolean;
}

export interface DynamicCategoriesResponse {
  success: boolean;
  is_leaf: boolean;
  current_parent: any;
  data: DynamicCategory[];
}

export interface ShopCategory {
  id: string;
  name: string;
  image_url: string | null;
}

export interface ShopNew {
  id: string;
  name: string;
  slug: string;
  description: string;
  business_address: string;
  business_phone: string;
  email: string;
  logo_url: string;
  banner_url: string;
  policy_description: string;
  accepts_returns: boolean;
  accepts_card_payment: boolean;
  is_active: boolean;
  social_links: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
    tiktok?: string;
    snapchat?: string;
  };
  categories: ShopCategory[];
  followers: number;
  followers_count: number;
  completedOrders: number;
  products_count: number;
  rating: number;
  is_following: boolean;
}

export interface ShopsResponseNew {
  success: boolean;
  pagination: {
    total: number;
    count: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
  data: ShopNew[];
}

export interface ShopDetailResponse {
  success: boolean;
  data: ShopNew;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  banner_url: string | null;
  business_address: string | null;
}

export interface ShopsResponse {
  success: boolean;
  data: { data: Shop[]; total?: number };
}

export interface ShopResponse {
  success: boolean;
  data: { data: Shop[] };
}

export interface PendingResponse {
  success: boolean;
  has_pending: boolean;
  status: string;
  message: string;
}

export interface UpgradeData {
  business_name: string;
  business_description: string;
  business_address: string;
  phone_number: string;
  email: string;
  category_ids: string[];
  accepted_terms: boolean;
  business_logo?: File | null;
  social_links?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
    tiktok?: string;
    snapchat?: string;
  } | string[];
}

export interface ApiResponse {
  success: boolean;
  message: string;
}


@Injectable({ providedIn: 'root' })
export class BuyerService {
  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl;

  // ── Wishlist ──

  getWishlist(): Observable<WishlistResponse> {
    return this.http.get<WishlistResponse>(`${this.BASE}/Buyer/Wishlist`);
  }

  toggleWishlist(productId: string): Observable<ToggleResponse> {
    return this.http.post<ToggleResponse>(
      `${this.BASE}/Buyer/Wishlist/toggle/${productId}`, {}
    );
  }

  removeFromWishlist(productId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.BASE}/Buyer/Wishlist/remove/${productId}`
    );
  }

  clearWishlist(): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.BASE}/Buyer/Wishlist/clear`);
  }

  // ── Shops ──

  getDynamicCategories(): Observable<DynamicCategoriesResponse> {
    return this.http.get<DynamicCategoriesResponse>(
      `${this.BASE}/Buyer/Categories/dynamic`
    );
  }

  getDynamicSubCategories(parentId: string): Observable<DynamicCategoriesResponse> {
    return this.http.get<DynamicCategoriesResponse>(
      `${this.BASE}/Buyer/Categories/dynamic?parent_id=${parentId}`
    );
  }

  getShops(pageOrCategories?: number | string[], perPage: number = 50, categoryIds?: string[]): Observable<ShopsResponseNew> {
    let page = 1;
    let limit = perPage;
    let cats = categoryIds;

    if (Array.isArray(pageOrCategories)) {
      cats = pageOrCategories;
      page = 1;
      limit = perPage || 50;
    } else if (typeof pageOrCategories === 'number') {
      page = pageOrCategories;
      limit = perPage || 50;
    }

    let params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(limit));

    if (cats && cats.length > 0) {
      cats.forEach((id, i) => {
        params = params.set(`category_ids[${i}]`, id);
      });
    }

    return this.http.get<ShopsResponseNew>(`${this.BASE}/store/shops`, { params });
  }

  // GET /Buyer/products
  getProducts(page = 1, perPage = 50, categoryId?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(perPage));
    if (categoryId) params = params.set('category_id', categoryId);
    return this.http.get<any>(`${this.BASE}/Buyer/products`, { params });
  }

  getShopById(id: string): Observable<ShopDetailResponse> {
    return this.http.get<ShopDetailResponse>(
      `${this.BASE}/store/shops/${id}`
    );
  }

  // GET /store/shops/{id}/products
  getShopProducts(shopId: string, categoryId?: string, page = 1, perPage = 50): Observable<any> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(perPage));
    if (categoryId) params = params.set('category_id', categoryId);
    return this.http.get<any>(`${this.BASE}/store/shops/${shopId}/products`, { params });
  }

  getShopsByCategory(slug: string): Observable<ShopsResponse> {
    return this.http.get<ShopsResponse>(
      `${this.BASE}/store/shops/category/${slug}`
    );
  }

  followShop(shopId: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/Buyer/shops/${shopId}/follow`, {}
    );
  }

  unfollowShop(shopId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.BASE}/Buyer/shops/${shopId}/unfollow`
    );
  }

  getUserFollowing(): Observable<ShopsResponse> {
    return this.http.get<ShopsResponse>(
      `${this.BASE}/Buyer/shops/UserFollowing`
    );
  }

  getShopFollowers(shopId: string): Observable<any> {
    return this.http.get<any>(
      `${this.BASE}/Buyer/shops/${shopId}/ShopFollowers`
    );
  }

  // ── Merchant Upgrade ──

  checkPendingUpgrade(): Observable<PendingResponse> {
    return this.http.get<PendingResponse>(
      `${this.BASE}/Buyer/Merchant/checkPending`
    );
  }

  requestUpgrade(data: UpgradeData): Observable<ApiResponse> {
    const formData = new FormData();
    formData.append('business_name', data.business_name);
    formData.append('business_description', data.business_description);
    formData.append('business_address', data.business_address);
    formData.append('phone_number', data.phone_number);
    formData.append('email', data.email);
    formData.append('accepted_terms', '1');
    formData.append('terms_accepted', '1');

    if (data.business_logo) {
      formData.append('business_logo', data.business_logo);
    }

    if (data.category_ids && data.category_ids.length > 0) {
      data.category_ids.forEach((id, index) => {
        formData.append(`category_ids[${index}]`, id);
      });
    }

    // Format social links into valid URLs
    const links: string[] = [];
    if (data.social_links) {
      if (Array.isArray(data.social_links)) {
        links.push(...data.social_links.filter(Boolean));
      } else {
        if (data.social_links.instagram?.trim()) {
          const ig = data.social_links.instagram.trim().replace(/^@/, '');
          links.push(ig.startsWith('http') ? ig : `https://instagram.com/${ig}`);
        }
        if (data.social_links.facebook?.trim()) {
          const fb = data.social_links.facebook.trim();
          links.push(fb.startsWith('http') ? fb : `https://facebook.com/${fb}`);
        }
        if (data.social_links.whatsapp?.trim()) {
          const wa = data.social_links.whatsapp.trim();
          if (wa.startsWith('http')) {
            links.push(wa);
          } else {
            const digits = wa.replace(/[^0-9]/g, '');
            if (digits) {
              const intl = digits.startsWith('218') ? digits : `218${digits.startsWith('0') ? digits.slice(1) : digits}`;
              links.push(`https://wa.me/${intl}`);
            }
          }
        }
      }
    }

    links.forEach((link, index) => {
      formData.append(`social_links[${index}]`, link);
    });

    return this.http.post<ApiResponse>(
      `${this.BASE}/Buyer/Merchant/Upgrade`, formData
    );
  }

  verifyUpgrade(otp_code: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/Buyer/Merchant/VerifyUpgrade`, { otp_code }
    );
  }

  resendUpgradeOtp(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/verification/resend-otp`,
      { channel: 'email', purpose: 'merchant_upgrade' }
    );
  }

  // POST /verification/resend-otp
  // Headers: Bearer Token
  // Body: { channel: "email", purpose: "merchant_upgrade" }
  // Response: { success: true, message }
  resendMerchantOtp(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/verification/resend-otp`,
      { channel: 'email', purpose: 'merchant_upgrade' }
    );
  }

  // PUT /user/profile/interests
  // Headers: Bearer Token
  // Body: { category_ids: ["uuid1", "uuid2"] }
  // Response: { success: true, message, interests: [...] }
  updateInterests(category_ids: string[]): Observable<any> {
    return this.http.put<any>(
      `${this.BASE}/user/profile/interests`,
      { category_ids }
    );
  }

  getImageUrl(url: string | null): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/storage/')) {
      return 'https://rdvvlvabfisrvesoltrd.supabase.co' + url;
    }
    return url;
  }

  // ── GET /Buyer/profile/{buyer} — بروفايل عام لأي مشتري ──
  // 403 إذا كان حساب إدارة — معالجه كحالة طبيعية "غير متاح"
  getPublicBuyerProfile(buyerId: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/Buyer/profile/${buyerId}`);
  }

  // ── GET /Buyer/profile/{buyer}/followed-shops ──
  // ⚠ التعشيش المزدوج موثق: العناصر في res.data.data وليس res.data مباشرة
  getBuyerFollowedShops(buyerId: string, page: number = 1): Observable<any> {
    return this.http.get<any>(
      `${this.BASE}/Buyer/profile/${buyerId}/followed-shops?per_page=10&page=${page}`
    );
  }

  // ── POST /Buyer/reports/store ──
  // target_type: 'product' | 'shop' | 'user' | 'review'
  submitReport(targetType: string, targetId: string, reason: string): Observable<any> {
    return this.http.post<any>(`${this.BASE}/Buyer/reports/store`, {
      target_type: targetType,
      target_id:   targetId,
      reason
    });
  }
}
