import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  product_id: string;
  product_title: string;
  quantity: number;
  price: number;
  color: string | null;
  size: string | null;
  image_url: string | null;
}

export interface Order {
  id: string;
  status: 'pending' | 'preparing' | 'awaiting' | 'completed' | 'cancelled' | 'confirmed';
  total_price: number;
  delivery_address: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  shop: { id: string; name: string; logo_url: string | null };
  items: OrderItem[];
}

export interface OrdersResponse {
  success: boolean;
  data: { data: Order[]; total: number };
}

export interface CheckoutPreviewResponse {
  success: boolean;
  data: {
    cart_items: unknown[];
    total_price: number;
    shop: { id: string; name: string };
  };
}

export interface PlaceOrderData {
  shop_id: string;
  shipping_address: string;
  notes?: string;
  payment_method: 'Cash on Delivery' | 'card';
}

export interface PlaceOrderResponse {
  success: boolean;
  message: string;
  order_id: string;
}

export interface OrderDetailResponse {
  success: boolean;
  data: Order;
}

export interface RateResponse {
  message: string;
  data: {
    id: number;
    buyer_id: number;
    product_id: number;
    order_item_id: number;
    rating: number;
    comment: string | null;
    created_at: string;
    updated_at: string;
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl;

  /**
   * GET /Buyer/orders?tab=all|pending|preparing|awaiting|completed|cancelled
   */
  getOrders(tab = 'all'): Observable<OrdersResponse> {
    return this.http.get<OrdersResponse>(
      `${this.BASE}/Buyer/orders?tab=${tab}`
    );
  }

  /**
   * GET /Buyer/orders/checkout-preview?shop_id={id}
   */
  getCheckoutPreview(shopId: string): Observable<any> {
    return this.http.get<any>(
      `${this.BASE}/Buyer/orders/checkout-preview?shop_id=${shopId}`
    );
  }

  /**
   * POST /Buyer/orders/store
   * Body: { shop_id, shipping_address, notes?, payment_method }
   */
  placeOrder(data: PlaceOrderData): Observable<PlaceOrderResponse> {
    return this.http.post<PlaceOrderResponse>(
      `${this.BASE}/Buyer/orders/store`,
      data
    );
  }

  /**
   * POST /Buyer/orders/store (flexible version for checkout component)
   * shipping_address can be a string or an object { city, street }
   */
  createOrder(data: { shop_id: string; shipping_address: unknown; payment_method: string }): Observable<any> {
    return this.http.post<any>(`${this.BASE}/Buyer/orders/store`, data);
  }

  /**
   * GET /Buyer/orders/{id}
   */
  getOrder(id: string): Observable<OrderDetailResponse> {
    return this.http.get<OrderDetailResponse>(
      `${this.BASE}/Buyer/orders/${id}`
    );
  }

  /**
   * GET /Buyer/orders/{id} — flexible return for order-details component
   */
  getOrderDetails(id: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/Buyer/orders/${id}`);
  }

  /**
   * POST /Buyer/orders/{id}/respond-review
   * Body: { accept: boolean }
   */
  respondReview(id: string, accept: boolean): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/Buyer/orders/${id}/respond-review`,
      { accept }
    );
  }

  /**
   * POST /Buyer/orders/{id}/confirm-receipt
   */
  confirmReceipt(id: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/Buyer/orders/${id}/confirm-receipt`,
      {}
    );
  }

  /**
   * POST /Buyer/orders/{id}/cancel
   * Body: { reason?: string }
   */
  cancelOrder(id: string, reason?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/Buyer/orders/${id}/cancel`,
      reason ? { reason } : {}
    );
  }

  /**
   * POST /Buyer/review/products/{product}/rate
   * Body: { rating: 1-5 }
   * — 403 error_code: OWN_PRODUCT_REVIEW_FORBIDDEN | PURCHASE_REQUIRED
   */
  rateProduct(productId: string, rating: number): Observable<RateResponse> {
    return this.http.post<RateResponse>(
      `${this.BASE}/Buyer/review/products/${productId}/rate`,
      { rating }
    );
  }

  // ── GET /Buyer/review/products/{product}/user-review ──
  getUserReviewStatus(productId: string): Observable<any> {
    return this.http.get<any>(
      `${this.BASE}/Buyer/review/products/${productId}/user-review`
    );
  }

  // ── GET /Buyer/review/products/comments/{product} ──
  getProductComments(productId: string, page: number = 1): Observable<any> {
    return this.http.get<any>(
      `${this.BASE}/Buyer/review/products/comments/${productId}?per_page=10&page=${page}`
    );
  }

  // ── GET /Buyer/review/products/rates/{product} ──  (includes summary)
  getProductRates(productId: string, page: number = 1): Observable<any> {
    return this.http.get<any>(
      `${this.BASE}/Buyer/review/products/rates/${productId}?per_page=10&page=${page}`
    );
  }

  // ── POST /Buyer/review/products/{product}/comment ──
  postComment(productId: string, comment: string | null): Observable<any> {
    return this.http.post<any>(
      `${this.BASE}/Buyer/review/products/${productId}/comment`, { comment }
    );
  }

  // ── DELETE /Buyer/review/products/{product}/delete-comment ──
  // ⚠ لا تُعيد data — حدّث الحالة محلياً بعد النجاح
  deleteComment(productId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.BASE}/Buyer/review/products/${productId}/delete-comment`
    );
  }
}
