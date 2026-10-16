import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MerchantTabsCount {
  all?: number;
  new?: number;
  pending?: number;
  preparing?: number;
  awaiting?: number;
  completed?: number;
  cancelled?: number;
}

export interface MerchantOrder {
  id:              string | number;
  order_code?:     string;
  order_number?:   string;
  buyerName?:      string;
  buyer?:          BuyerDetails;
  buyer_details?:  BuyerDetails;
  productName?:    string;
  price?:          number;
  total_price?:    number | string;
  date?:           string;
  order_date?:     string;
  created_at?:     string;
  status:          'pending' | 'waiting_buyer' | 'preparing' | 'awaiting' | 'completed' | 'cancelled' | string;
  payment_method?: string;
  items?:          any[];
  snapshot_shipping_address?: string | Record<string, string>;
}

export interface MerchantOrdersResponse {
  success:     boolean;
  tabs_count?: MerchantTabsCount;
  data:        MerchantOrder[] | { data: MerchantOrder[]; current_page?: number; last_page?: number; total?: number; per_page?: number };
}

export interface BuyerDetails {
  id:           string;
  full_name:    string;
  email:        string;
  phone_number?: string;
  avatar_url?:  string;
}

export interface SellerOrderItem {
  item_id:        string;
  product_id:     string;
  product_title:  string;
  quantity:       number;
  unit_price:     number;
  total_item_price: number;
  color?:         string;
  size?:          string;
  availability:   'pending' | 'available' | 'unavailable';
  image?:         string;
  review_notes?:  string;
}

export interface SellerOrderInvoice {
  order_number:           string;
  order_date:             string;
  status:                 'pending' | 'waiting_buyer' | 'preparing' | 'awaiting' | 'completed' | 'cancelled';
  payment_method:         string;
  total_price:            number;
  shipping_address:       Record<string, string> | null;
  buyer_details:          BuyerDetails;
  requires_buyer_approval: boolean;
  items:                  SellerOrderItem[];
}

export interface SellerOrderDetailResponse {
  success: boolean;
  invoice: SellerOrderInvoice;
}

export interface MerchantDashboardResponse {
  success: boolean;
  data: {
    shop_info: {
      name: string;
      is_active: boolean;
      status_text: string;
    };
    cards: {
      products_count: number;
      followers_count: number;
      total_orders: number;
      completed_orders: number;
    };
    general_rating: {
      average: number;
      display_text: string;
    };
    analytics_and_growth: {
      highest_sales_day: string;
      most_active_month: string;
      order_growth: string;
    };
    order_analytics_chart: {
      completed_percent: number;
      pending_percent: number;
    };
  };
}

export interface StoreProfile {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  banner_url: string | null;
  business_phone: string;
  email?: string;
  social_links: {
    instagram?: string;
    facebook?: string;
  };
  accepts_returns: boolean;
  accepts_card_payment: boolean;
  policy_description: string;
  category_ids: string[];
  created_at: string;
}

export interface StoreProfileResponse {
  success: boolean;
  data: StoreProfile;
}

export interface UpdateStoreData {
  name: string;
  description: string;
  business_phone: string;
  social_links: { instagram?: string; facebook?: string };
  accepts_returns: boolean;
  accepts_card_payment: boolean;
  policy_description: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({ providedIn: 'root' })
export class MerchantService {
  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl;

  getDashboard(): Observable<MerchantDashboardResponse> {
    return this.http.get<MerchantDashboardResponse>(
      `${this.BASE}/store/phone/dashboard`
    );
  }

  getStoreProfile(): Observable<StoreProfileResponse> {
    return this.http.get<StoreProfileResponse>(
      `${this.BASE}/store/profile/Show`
    );
  }

  updateStoreProfile(data: UpdateStoreData): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/profile/update`, data
    );
  }

  updateLogo(file: File): Observable<ApiResponse> {
    const form = new FormData();
    form.append('logo', file);
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/profile/logo`, form
    );
  }

  updateBanner(file: File): Observable<ApiResponse> {
    const form = new FormData();
    form.append('banner', file);
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/profile/banner`, form
    );
  }

  updateStoreCategories(category_ids: string[]): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/profile/categories`,
      { category_ids }
    );
  }

  requestStoreEmailChange(email: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/change-email/request`,
      { email }
    );
  }

  verifyStoreEmailChange(otp_code: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/change-email/verify`,
      { otp_code }
    );
  }

  // ── GET /store/orders ──
  getOrders(tab?: string): Observable<MerchantOrdersResponse> {
    let apiTab = tab;
    if (apiTab === 'pending') apiTab = 'new';
    const params = apiTab && apiTab !== 'all' ? `?tab=${apiTab}` : '';
    return this.http.get<MerchantOrdersResponse>(
      `${this.BASE}/store/orders${params}`
    );
  }

  // ── PATCH /store/orders/{id}/status ──
  updateOrderStatus(
    orderId: string | number,
    status: 'pending' | 'completed' | 'cancelled'
  ): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
      `${this.BASE}/store/orders/${orderId}/status`,
      { status }
    );
  }

  // ── GET /store/orders/{id} — seller order detail ──
  getSellerOrderDetails(orderId: string): Observable<SellerOrderDetailResponse> {
    return this.http.get<SellerOrderDetailResponse>(
      `${this.BASE}/store/orders/${orderId}`
    );
  }

  // ── POST /store/orders/{id}/mark-ready ──
  markOrderReady(orderId: string | number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/orders/${orderId}/mark-ready`, {}
    );
  }

  // ── POST /store/orders/{id}/cancel (seller) ──
  cancelOrderAsSeller(orderId: string | number, reason: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/orders/${orderId}/cancel`, { reason }
    );
  }

  // ── POST /store/orders/{id}/review ──
  reviewOrderItems(
    orderId: string,
    items: { id: string; is_available: boolean; notes?: string }[]
  ): Observable<any> {
    return this.http.post<any>(
      `${this.BASE}/store/orders/${orderId}/review`, { items }
    );
  }

  // ── Category Targets / Transfer (future use) ─────────────────────
  getCategoryTargets(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/store/profile/categories/Targets`);
  }

  transferCategory(targetCategoryId: string): Observable<any> {
    return this.http.post<any>(
      `${this.BASE}/store/profile/categories/Transfer`,
      { target_category_id: targetCategoryId }
    );
  }

  // ── GET /store/reviews (reviews on merchant's products) ──
  getReviews(page: number = 1, perPage: number = 15): Observable<any> {
    return this.http.get<any>(
      `${this.BASE}/store/reviews?per_page=${perPage}&page=${page}`
    );
  }
}
