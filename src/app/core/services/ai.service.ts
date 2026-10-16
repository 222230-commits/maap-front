import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Interfaces (مطابقة لمعايير STEP 2)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SearchParams {
  q?: string;
  categories?: string[];
  category?: string[];
  colors?: string[];
  color?: string[];
  sizes?: string[];
  size?: string[];
  minPrice?: number;
  min_price?: number;
  maxPrice?: number;
  max_price?: number;
}
export type AiSearchParams = SearchParams;

export interface SearchResponse {
  success: boolean;
  message?: string;
  data: any[];
  total_results?: number;
  is_empty_query?: boolean;
}
export type AiSearchResponse = SearchResponse;

export interface HomeRecommendationsResponse {
  success: boolean;
  data: {
    most_popular: any[];
    top_rated: any[];
    top_stores: any[];
    recommended_for_you?: any[];
    because_you_like?: any[];
  };
  most_popular?: any[];
  top_rated?: any[];
  top_stores?: any[];
  recommended_for_you?: any[];
  because_you_like?: any[];
  personalized_type?: 'recommended_for_you' | 'because_you_like' | null;
  personalized_title?: string;
  personalized_items?: any[];
  personalized: {
    title: string;
    type: string;
    items: any[];
  };
}
export type AiHomeRecommendations = HomeRecommendationsResponse;

export interface SimilarResponse {
  success: boolean;
  data: Array<any | { debug_error: string }>;
}

export interface CategoryRecommendationsResponse {
  status: string; // "success"
  data: any[];
}

export interface CommentCheckResponse {
  is_allowed: boolean;
  allowed?: boolean;
  message: string;
  reason?: string;
  is_service_error?: boolean;
}
export type AiCommentCheckResponse = CommentCheckResponse;

export interface EmbeddingResponse {
  success: boolean;
  message: string;
}

export interface AiSyncResponse {
  success: boolean;
  message: string;
  batch_id?: string;
  status: 'dispatched' | 'empty' | 'error';
  error_detail?: string;
  status_code?: number;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl;

  /**
   * 1. بحث المنتجات الهجين الدلالي (Hybrid Semantic Search)
   * GET /Buyer/products/search?q=...&category[]=...&color[]=...
   */
  searchProducts(filters: SearchParams): Observable<SearchResponse> {
    const cats = filters.categories || filters.category || [];
    const cols = filters.colors || filters.color || [];
    const sizes = filters.sizes || filters.size || [];
    const minP = filters.minPrice ?? filters.min_price;
    const maxP = filters.maxPrice ?? filters.max_price;

    const hasQuery = !!filters.q?.trim();
    const hasCat = cats.length > 0;
    const hasColor = cols.length > 0;
    const hasSize = sizes.length > 0;
    const hasMin = minP !== undefined && minP !== null;
    const hasMax = maxP !== undefined && maxP !== null;

    if (!hasQuery && !hasCat && !hasColor && !hasSize && !hasMin && !hasMax) {
      // الفخ 1: إذا كانت كل الفلاتر فارغة معاً
      return of({
        success: true,
        data: [],
        is_empty_query: true,
        message: 'ابدأ البحث بكتابة اسم منتج أو اختيار تصنيف'
      });
    }

    let params = new HttpParams();

    if (hasQuery) {
      params = params.set('q', filters.q!.trim());
    }

    // إرسال المصفوفات بصيغة key[]=value وفقاً للدليل
    cats.forEach(cat => {
      if (cat) params = params.append('category[]', cat);
    });

    cols.forEach(col => {
      if (col) params = params.append('color[]', col);
    });

    sizes.forEach(sz => {
      if (sz) params = params.append('size[]', sz);
    });

    if (hasMin) {
      params = params.set('min_price', String(minP));
    }

    if (hasMax) {
      params = params.set('max_price', String(maxP));
    }

    return this.http.get<any>(`${this.BASE}/Buyer/products/search`, { params }).pipe(
      map(res => {
        const list = Array.isArray(res?.data) ? res.data : [];
        return {
          success: res?.success !== false,
          message: res?.message ?? '',
          data: list,
          is_empty_query: false
        };
      }),
      catchError(err => {
        // الفخ 2: معالجة خطأ 500 من خدمة بايثون واستخراج الرسالة العربية
        const errMsg = err?.error?.message || 'تعذر الاتصال بخدمة البحث حالياً';
        return of({
          success: false,
          message: errMsg,
          data: [],
          is_empty_query: false
        });
      })
    );
  }

  /**
   * 2. توصيات الصفحة الرئيسية (Home Recommendations)
   * GET /recommendations/home
   * ديناميكية بالكامل: most_popular, top_rated, top_stores, plus (recommended_for_you OR because_you_like)
   */
  getHomeRecommendations(): Observable<AiHomeRecommendations> {
    return this.http.get<any>(`${this.BASE}/recommendations/home`).pipe(
      map(res => {
        const data = res?.data ?? res ?? {};

        const most_popular = Array.isArray(data.most_popular) ? data.most_popular : [];
        const top_rated    = Array.isArray(data.top_rated) ? data.top_rated : [];
        const top_stores   = Array.isArray(data.top_stores) ? data.top_stores : [];

        // الفخ 3: التعامل مع القسم الرابع ديناميكياً
        let personalized_type: 'recommended_for_you' | 'because_you_like' | null = null;
        let personalized_title = '';
        let personalized_items: any[] = [];

        if (Array.isArray(data.recommended_for_you) && data.recommended_for_you.length > 0) {
          personalized_type = 'recommended_for_you';
          personalized_title = 'موصى به لك بناءً على نشاطك';
          personalized_items = data.recommended_for_you;
        } else if (Array.isArray(data.because_you_like) && data.because_you_like.length > 0) {
          personalized_type = 'because_you_like';
          personalized_title = 'بناءً على اهتماماتك';
          personalized_items = data.because_you_like;
        }

        return {
          success: true,
          data: {
            most_popular,
            top_rated,
            top_stores,
            recommended_for_you: data.recommended_for_you,
            because_you_like: data.because_you_like
          },
          most_popular,
          top_rated,
          top_stores,
          recommended_for_you: data.recommended_for_you,
          because_you_like: data.because_you_like,
          personalized_type,
          personalized_title,
          personalized_items,
          personalized: {
            title: personalized_title,
            type: personalized_type ?? 'none',
            items: personalized_items
          }
        };
      }),
      catchError(() => {
        return of({
          success: false,
          data: {
            most_popular: [],
            top_rated: [],
            top_stores: [],
            recommended_for_you: [],
            because_you_like: []
          },
          most_popular: [],
          top_rated: [],
          top_stores: [],
          recommended_for_you: [],
          because_you_like: [],
          personalized_type: null,
          personalized_title: '',
          personalized_items: [],
          personalized: {
            title: '',
            type: 'none',
            items: []
          }
        });
      })
    );
  }

  /**
   * 3. منتجات مشابهة (Similar Products)
   * GET /recommendations/products/{id}/similar
   * ⚠️ تحقق من debug_error في كل عنصر
   */
  getSimilarProducts(productId: string | number): Observable<SimilarResponse> {
    return this.http.get<any>(`${this.BASE}/recommendations/products/${productId}/similar`).pipe(
      map(res => {
        const rawList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const resp: SimilarResponse = {
          success: res?.success !== false,
          data: rawList
        };
        return Object.assign(resp, rawList);
      }),
      catchError(() => of(Object.assign({ success: false, data: [] }, [])))
    );
  }

  /**
   * 4. توصيات حسب التصنيف (Category Recommendations)
   * GET /recommendations/category/{categoryId}
   * كاش ساعة لكل تصنيف
   */
  getCategoryRecommendations(categoryId: string | number): Observable<CategoryRecommendationsResponse> {
    return this.http.get<any>(`${this.BASE}/recommendations/category/${categoryId}`).pipe(
      map(res => {
        const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const resp: CategoryRecommendationsResponse = {
          status: 'success',
          data: raw
        };
        return Object.assign(resp, raw);
      }),
      catchError(() => of(Object.assign({ status: 'error', data: [] }, [])))
    );
  }

  /**
   * 5. توليد متجه المنتج للتاجر (Generate Product Embedding)
   * POST /store/products/{id}/generate-embedding
   * الفخ 6: العملية تتم في الخلفية
   */
  generateProductEmbedding(productId: string | number): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${this.BASE}/store/products/${productId}/generate-embedding`, {}).pipe(
      map(res => ({
        success: res?.success !== false,
        message: res?.message || 'تم إرسال طلب توليد المتجه، تجري المعالجة الآن في الخلفية.'
      })),
      catchError(err => {
        const msg = err?.error?.message || 'تعذر بدء توليد متجه المنتج حالياً.';
        return of({ success: false, message: msg });
      })
    );
  }

  /**
   * 6. حذف منتج من فهرس البحث للتاجر (Remove from Search Index)
   * DELETE /store/products/search/products/{id}/remove
   * الفخ 9: 404 حالة طبيعية وليست خطأ فادحاً
   */
  removeProductFromSearchIndex(productId: string | number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${this.BASE}/store/products/search/products/${productId}/remove`).pipe(
      map(res => ({
        success: res?.success !== false,
        message: res?.message || 'تم حذف المنتج من فهرس البحث.'
      })),
      catchError(err => {
        if (err?.status === 404) {
          return of({
            success: true,
            message: 'المنتج لم يكن مفهرساً أصلاً في محرك البحث.'
          });
        }
        return of({
          success: false,
          message: err?.error?.message || 'فشلت عملية حذف المنتج من الفهرس.'
        });
      })
    );
  }

  /**
   * 7. مزامنة شاملة لمحرك البحث للأدمن (Admin Search Engine Sync)
   * POST /admin/products/sync-search-engine
   * الفخ 7 و 8: status 202 مع batch_id
   */
  syncSearchEngine(): Observable<AiSyncResponse> {
    return this.http.post<any>(`${this.BASE}/admin/products/sync-search-engine`, {}).pipe(
      map(res => ({
        success: res?.success !== false,
        message: res?.message || 'تم بدء المزامنة بنجاح في الخلفية.',
        batch_id: res?.batch_id,
        status: (res?.batch_id ? 'dispatched' : 'empty') as 'dispatched' | 'empty',
        status_code: 202
      })),
      catchError(err => {
        if (err?.status === 200 || err?.error?.success === true) {
          return of({
            success: true,
            message: err?.error?.message || 'لا توجد منتجات منشورة للمزامنة.',
            status: 'empty' as const,
            status_code: 200
          });
        }
        return of({
          success: false,
          message: err?.error?.message || 'فشلت تهيئة المزامنة الشاملة.',
          error_detail: err?.error?.error_detail || err?.message,
          status: 'error' as const,
          status_code: err?.status || 500
        });
      })
    );
  }

  /**
   * 8. فحص التعليق عبر خدمة الذكاء الاصطناعي (Comment Filter)
   * POST /Buyer/review/products/check-comment
   * الفخ 10 و 11: فحص استشاري UX تحذيري
   */
  checkComment(commentText: string): Observable<AiCommentCheckResponse> {
    return this.http.post<any>(`${this.BASE}/Buyer/review/products/check-comment`, {
      comment: commentText
    }).pipe(
      map(res => {
        const isAllowed = res?.is_allowed !== false;
        const msg = res?.message || (!isAllowed ? 'قد يحتوي التعليق على عبارات غير ملائمة.' : 'التعليق مقبول.');
        return {
          is_allowed: isAllowed,
          allowed: isAllowed,
          message: msg,
          reason: msg
        };
      }),
      catchError(() => {
        // الفخ 10: عند انقطاع الاتصال بخدمة الذكاء الاصطناعي لا نمنع المستخدم
        return of({
          is_allowed: true,
          allowed: true,
          message: 'تم تجاوز فحص التعليق بسبب عدم استجابة خدمة التحقق.',
          reason: '',
          is_service_error: true
        });
      })
    );
  }
}
