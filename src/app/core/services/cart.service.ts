import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface CartItem {
  cart_item_id: string;
  product_id: string;
  title: string;
  slug: string;
  quantity: number;
  price: number;
  compare_at_price: number | null;
  discount_percentage: number;
  color_id: string | null;
  shade_id: string | null;
  size_id: string | null;
  color_name: string | null;
  shade_name: string | null;
  size_name: string | null;
  total_price: number;
  stock: number;
  is_available: boolean;
  is_color_valid?: boolean;
  is_shade_valid?: boolean;
  is_size_valid?: boolean;
  image_url: string | null;
}

export interface CartShop {
  shop_id: string;
  shop_name: string;
  shop_slug: string;
  shop_logo_url: string | null;
  subtotal: number;
  items_count: number;
  items: CartItem[];
}

export interface CartData {
  cart_id: string;
  total_items_count: number;
  grand_total: number;
  shops: CartShop[];
}

export interface CartResponse {
  message?: string;
  // POST/PUT/DELETE يرجعون { message, data: CartData }
  data?: CartData;
  // GET /buyer/cart يرجع CartData مباشرة (cart_id في الـ root)
  cart_id?: string;
  total_items_count?: number;
  grand_total?: number;
  shops?: CartShop[];
  // أخطاء
  error?: string;
  available_stock?: number;
}

export interface AddToCartPayload {
  product_id: string;
  quantity?: number;
  color_id?: string;
  shade_id?: string;
  size_id?: string;
}

export interface UpdateCartPayload {
  quantity: number;
  color_id?: string;
  shade_id?: string;
  size_id?: string;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl;

  // ── حالة السلة المحلية ──
  private _cart = signal<CartData | null>(null);

  // ── الـ signals العامة ──
  readonly cart = this._cart.asReadonly();
  readonly shops = computed(() => this._cart()?.shops ?? []);
  readonly totalItems = computed(() => this._cart()?.total_items_count ?? 0);
  readonly grandTotal = computed(() => this._cart()?.grand_total ?? 0);
  readonly isEmpty = computed(() => this.totalItems() === 0);

  /** دمج استجابة الـ API في _cart — يتعامل مع شكلين: { data: CartData } و CartData مباشرة */
  private setCart(res: CartResponse): void {
    if (res.data) {
      this._cart.set(res.data);
    } else if (res.cart_id) {
      // الاستجابة هي CartData مباشرة (GET /buyer/cart)
      this._cart.set({
        cart_id: res.cart_id!,
        total_items_count: res.total_items_count ?? 0,
        grand_total: res.grand_total ?? 0,
        shops: res.shops ?? []
      });
    }
  }

  // ── GET /Buyer/cart ──
  loadCart(): Observable<CartResponse> {
    return this.http.get<CartResponse>(`${this.BASE}/Buyer/cart`).pipe(
      tap(res => this.setCart(res))
    );
  }

  // ── POST /Buyer/cart/items ──
  addItem(payload: AddToCartPayload): Observable<CartResponse> {
    return this.http.post<CartResponse>(`${this.BASE}/Buyer/cart/items`, payload).pipe(
      tap(res => this.setCart(res))
    );
  }

  // ── PUT /Buyer/cart/items/{id} (update quantity) ──
  updateCartItem(cartItemId: string, quantity: number): Observable<CartResponse> {
    return this.http.put<CartResponse>(
      `${this.BASE}/Buyer/cart/items/${cartItemId}`,
      { quantity }
    ).pipe(
      catchError(() => this.http.put<CartResponse>(`${this.BASE}/buyer/cart/items/${cartItemId}`, { quantity })),
      catchError(() => this.http.put<CartResponse>(`${this.BASE}/cart/items/${cartItemId}`, { quantity })),
      tap(res => this.setCart(res))
    );
  }

  // ── DELETE /Buyer/cart/items/{id} (remove item) ──
  removeCartItem(cartItemId: string): Observable<CartResponse> {
    return this.http.delete<CartResponse>(
      `${this.BASE}/Buyer/cart/items/${cartItemId}`
    ).pipe(
      catchError(() => this.http.delete<CartResponse>(`${this.BASE}/buyer/cart/items/${cartItemId}`)),
      catchError(() => this.http.delete<CartResponse>(`${this.BASE}/cart/items/${cartItemId}`)),
      tap(res => this.setCart(res))
    );
  }

  // ── PUT /Buyer/cart/items/{id} ──
  updateItem(cartItemId: string, payload: UpdateCartPayload): Observable<CartResponse> {
    return this.http.put<CartResponse>(
      `${this.BASE}/Buyer/cart/items/${cartItemId}`, payload
    ).pipe(tap(res => this.setCart(res)));
  }

  // ── DELETE /Buyer/cart/items/{id} ──
  removeItem(cartItemId: string): Observable<CartResponse> {
    return this.removeCartItem(cartItemId);
  }

  // ── DELETE /Buyer/cart/clear ──
  clearCart(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.BASE}/Buyer/cart/clear`).pipe(
      tap(() => this._cart.set(null))
    );
  }

  /** هل المتجر فيه أي عنصر غير متوفر؟ */
  hasUnavailableItems(shop: CartShop): boolean {
    return shop.items.some(item => !item.is_available);
  }
}
