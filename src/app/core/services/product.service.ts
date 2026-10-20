import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, switchMap, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price: number;
  stock: number;
  is_active: boolean;
  created_at: string;
  category_id: string;
}

export interface ProductDetail extends Product {
  features_list: string[];
  tags_list: string[];
  grouped_images: Record<string, ProductImage[]>;
  category: { id: string; name: string };
  colors: Color[];
  sizes: Size[];
  reviews: any[];
}

export interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  color_id: string | null;
  sort_order?: number;
  color?: Color;
}

export interface Color {
  id: string;
  name: string;
  family?: string;
  hex_code: string;
}

export interface Size {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_leaf?: boolean;
  image_url?: string | null;
}

export interface Tag {
  id: string;
  name: string;
  shop_id?: string;
}

export interface Feature {
  id: string;
  name: string;
  shop_id?: string;
}

export interface CreateProductData {
  category_id: string;
  title: string;
  description: string;
  price: number;
  compare_at_price: number;
  stock: number;
  color_ids: string[];
  size_ids: string[];
}

export interface ProductsResponse {
  success: boolean;
  data: {
    stats: {
      all: number;
      out_of_stock: number;
      low_stock: number;
      draft: number;
    };
    products: {
      data: Product[];
      total: number;
      current_page: number;
      last_page: number;
    };
  };
}

export interface ProductDetailResponse {
  success: boolean;
  data: ProductDetail;
}

export interface CreateProductResponse {
  success: boolean;
  message: string;
  id: string;
}

export interface ColorsResponse {
  success: boolean;
  data: Color[];
}

export interface SizesResponse {
  success: boolean;
  data: Size[];
}

export interface CategoriesResponse {
  success: boolean;
  is_leaf?: boolean;
  data: Category[];
}

export interface TagsResponse {
  success: boolean;
  data: {
    system_tags: Tag[];
    merchant_tags: Tag[];
  };
}

export interface FeaturesResponse {
  success: boolean;
  data: {
    system_features: Feature[];
    merchant_features: Feature[];
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl;

  // GET /store/products?tab=... â€” Ù‚Ø§Ø¦Ù…Ø© Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„ØªØ§Ø¬Ø±
  getProducts(tab = 'all'): Observable<ProductsResponse> {
    return this.http.get<ProductsResponse>(
      `${this.BASE}/store/products?tab=${tab}`
    );
  }

  // GET /store/products/{id} â€” ØªÙØ§ØµÙŠÙ„ Ù…Ù†ØªØ¬ ÙˆØ§Ø­Ø¯ (UUID ÙÙ‚Ø·ØŒ Ù„ÙŠØ³ slug)
  // GET /store/products/{id} â€” ØªÙ Ø§ØµÙŠÙ„ Ù…Ù†ØªØ¬ ÙˆØ§Ø­Ø¯ (UUID Ù Ù‚Ø·ØŒ Ù„ÙŠØ³ slug)
  getProduct(id: string): Observable<ProductDetailResponse> {
    return this.http.get<ProductDetailResponse>(
      `${this.BASE}/store/products/${id}`
    );
  }

  private productCache = new Map<string, any>();

  cacheProduct(product: any): void {
    if (!product) return;
    if (product.id) this.productCache.set(String(product.id), product);
    if (product.slug) this.productCache.set(String(product.slug), product);
  }

  cacheProducts(products: any[]): void {
    if (!Array.isArray(products)) return;
    products.forEach(p => this.cacheProduct(p));
  }

  getCachedProduct(slugOrId: string | number): any | null {
    if (!slugOrId) return null;
    return this.productCache.get(String(slugOrId)) || null;
  }

  /** GET /Buyer/products/{slug} — مسار عام بدون auth مع احتياطي /products/{slug} */
  getProductPublic(slug: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/Buyer/products/${slug}`).pipe(
      catchError(() => this.http.get<any>(`${this.BASE}/products/${slug}`))
    );
  }

  /**
   * جلب تفاصيل المنتج سواء تم تمرير slug أو UUID
   * يبحث أولاً في الكاش المحلي، ثم عبر الـ API العام، ثم عبر القوائم والتوصيات
   */
  getProductByUuidOrSlug(slugOrId: string): Observable<any> {
    const cached = this.getCachedProduct(slugOrId);
    if (cached) {
      return of({ status: 'success', data: cached });
    }

    return this.getProductPublic(slugOrId).pipe(
      switchMap((res: any) => {
        const raw = res?.data ?? res;
        if (raw && (raw.id || raw.title || raw.name)) {
          this.cacheProduct(raw);
          return of(res);
        }
        return of(res);
      }),
      catchError(() => {
        // في حال كان slugOrId عبارة عن UUID أو فشل المسار المباشر، نبحث في المنتجات العامة
        return this.getBuyerProducts({ per_page: 50 }).pipe(
          switchMap((res: any) => {
            const list: any[] = res?.data?.data ?? res?.data ?? [];
            const found = list.find((item: any) =>
              String(item.id) === String(slugOrId) || item.slug === slugOrId
            );
            if (found?.slug && found.slug !== slugOrId) {
              return this.getProductPublic(found.slug);
            }
            if (found) {
              this.cacheProduct(found);
              return of({ status: 'success', data: found });
            }
            // محاولة إضافية عبر مسار التوصيات (يحتوي 30 منتجاً)
            return this.http.get<any>(`${this.BASE}/recommendations/home`).pipe(
              switchMap((recRes: any) => {
                const recData = recRes?.data ?? {};
                const recList: any[] = [
                  ...(recData.most_popular || []),
                  ...(recData.top_rated || []),
                  ...(recData.recommended_for_you || []),
                  ...(recData.because_you_like || [])
                ];
                const recFound = recList.find((item: any) =>
                  String(item.id) === String(slugOrId) || item.slug === slugOrId
                );
                if (recFound?.slug && recFound.slug !== slugOrId) {
                  return this.getProductPublic(recFound.slug);
                }
                if (recFound) {
                  this.cacheProduct(recFound);
                  return of({ status: 'success', data: recFound });
                }
                return of({ status: 'error', message: 'المنتج غير متاح' });
              }),
              catchError(() => of({ status: 'error', message: 'المنتج غير متاح' }))
            );
          }),
          catchError(() => of({ status: 'error', message: 'المنتج غير متاح' }))
        );
      })
    );
  }

  /**
   * GET /Buyer/products — قائمة المنتجات العامة (بدون auth)
   * مع احتياطي إلى /productsAll
   */
  getBuyerProducts(params?: {
    category_id?: string;
    search?:      string;
    sort_by?:     string;
    per_page?:    number;
    page?:        number;
  }): Observable<any> {
    let p = new HttpParams();
    if (params?.category_id) p = p.set('category_id', params.category_id);
    if (params?.search)      p = p.set('search',      params.search);
    if (params?.sort_by)     p = p.set('sort_by',     params.sort_by);
    if (params?.per_page)    p = p.set('per_page',    String(params.per_page));
    if (params?.page)        p = p.set('page',         String(params.page));
    return this.http.get<any>(`${this.BASE}/Buyer/products`, { params: p }).pipe(
      catchError(() => this.http.get<any>(`${this.BASE}/productsAll`, { params: p }))
    );
  }

  /**
   * GET /productsAll — كل منتجات المنصة (بدون auth)
   * مع احتياطي إلى /Buyer/products
   */
  getAllPublicProducts(params?: {
    per_page?: number;
    category_id?: string;
    page?: number;
  }): Observable<any> {
    let p = new HttpParams();
    if (params?.per_page)    p = p.set('per_page',    String(params.per_page));
    if (params?.category_id) p = p.set('category_id', params.category_id);
    if (params?.page)        p = p.set('page',         String(params.page));
    return this.http.get<any>(`${this.BASE}/productsAll`, { params: p }).pipe(
      catchError(() => this.http.get<any>(`${this.BASE}/Buyer/products`, { params: p }))
    );
  }

  getProductImages(productId: string): Observable<any> {
    return this.http.get<any>(
      `${this.BASE}/store/products/${productId}/product-images`
    );
  }

  // POST /store/products/create
  createProduct(data: CreateProductData): Observable<CreateProductResponse> {
    return this.http.post<CreateProductResponse>(
      `${this.BASE}/store/products/create`, data
    );
  }

  // PUT /store/products/{id}/update
  updateProduct(id: string, data: CreateProductData): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.BASE}/store/products/${id}/update`, data
    );
  }

  // POST /store/products/{id}/publish
  togglePublish(id: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/products/${id}/publish`, {}
    );
  }

  // DELETE /store/products/{id}/delete
  deleteProduct(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.BASE}/store/products/${id}/delete`
    );
  }

  // POST /store/products/{id}/restore
  restoreProduct(id: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/products/${id}/restore`, {}
    );
  }

  // GET /store/products?tab=trashed
  getTrashedProducts(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/store/products?tab=trashed`);
  }

  // PATCH /store/products/move
  moveProduct(draggedId: string, targetIndex: number): Observable<any> {
    return this.http.patch<any>(
      `${this.BASE}/store/products/move`,
      { product_ids: [draggedId], new_position: targetIndex }
    );
  }

  // POST /store/products/{id}/images
  uploadImagesWithColor(
    productId: string, files: File[], colorId: string
  ): Observable<ApiResponse> {
    const formData = new FormData();
    files.forEach((file, i) => {
      formData.append(`images[${i}][file]`, file);
      formData.append(`images[${i}][color_id]`, colorId);
    });
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/products/${productId}/images`, formData
    );
  }

  // POST /store/products/products/{id}/general-images (prefix Ù…ÙƒØ±Ø± ÙÙŠ Ø§Ù„Ø¯Ù„ÙŠÙ„ â€” ÙƒÙ…Ø§ Ù‡Ùˆ)
  uploadGeneralImages(
    productId: string, files: File[]
  ): Observable<ApiResponse> {
    const form = new FormData();
    files.forEach((file, index) => {
      form.append(`images[${index}][file]`, file);
    });
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/products/products/${productId}/general-images`,
      form
    );
  }

  // PATCH /store/products/{productId}/images/{imageId}/set-primary
  setPrimaryImage(productId: string, imageId: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
      `${this.BASE}/store/products/${productId}/images/${imageId}/set-primary`,
      {}
    );
  }

  // DELETE /store/products/{productId}/images/{imageId}/delete
  deleteImage(productId: string, imageId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.BASE}/store/products/${productId}/images/${imageId}/delete`
    );
  }

  // PATCH /store/products/{id}/images/sort
  sortImages(productId: string, imageIds: string[]): Observable<any> {
    return this.http.patch<any>(
      `${this.BASE}/store/products/${productId}/images/sort`,
      { image_ids: imageIds }
    );
  }

  // GET /store/colors  /  GET /store/sizes (مع احتياطي لـ admin ولتجنب انقطاع الواجهة)
  getColors(): Observable<ColorsResponse> {
    return this.http.get<any>(`${this.BASE}/store/colors`).pipe(
      catchError(() => this.http.get<any>(`${this.BASE}/admin/colors`)),
      map((res: any) => {
        const list = Array.isArray(res?.data)
          ? res.data
          : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
        return { success: res?.success !== false, data: list };
      }),
      catchError(() => of({ success: true, data: [] }))
    );
  }

  getSizes(): Observable<SizesResponse> {
    return this.http.get<any>(`${this.BASE}/store/sizes`).pipe(
      catchError(() => this.http.get<any>(`${this.BASE}/admin/sizes`)),
      map((res: any) => {
        const list = Array.isArray(res?.data)
          ? res.data
          : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
        return { success: res?.success !== false, data: list };
      }),
      catchError(() => of({ success: true, data: [] }))
    );
  }

  // GET /store/categories (مع fallback تلقائي إلى /Buyer/Categories/dynamic إذا لم يفعل التاجر تصنيفات أو تعذر الوصول)
  getCategories(parentId?: string): Observable<CategoriesResponse> {
    const storeUrl = parentId
      ? `${this.BASE}/store/categories?parent_id=${parentId}`
      : `${this.BASE}/store/categories`;
    const buyerUrl = parentId
      ? `${this.BASE}/Buyer/Categories/dynamic?parent_id=${parentId}`
      : `${this.BASE}/Buyer/Categories/dynamic`;

    return this.http.get<any>(storeUrl).pipe(
      switchMap((res: any) => {
        const list = Array.isArray(res?.data)
          ? res.data
          : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
        if (list.length > 0) {
          return of({ success: true, is_leaf: res?.is_leaf, data: list });
        }
        return this.http.get<any>(buyerUrl);
      }),
      catchError(() => this.http.get<any>(buyerUrl)),
      map((res: any) => {
        const list = Array.isArray(res?.data)
          ? res.data
          : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
        return {
          success: res?.success !== false,
          is_leaf: res?.is_leaf,
          data: list
        };
      }),
      catchError(() => of({ success: false, data: [] }))
    );
  }

  // GET /store/tags
  getTags(): Observable<TagsResponse> {
    return this.http.get<TagsResponse>(`${this.BASE}/store/tags`);
  }

  // POST /store/tags/create/{productId}
  createTag(productId: string, name: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/tags/create/${productId}`, { name }
    );
  }

  // POST /store/tags/{productId}/attach-tag
  attachTags(productId: string, tag_ids: string[]): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/tags/${productId}/attach-tag`, { tag_ids }
    );
  }

  // DELETE /store/tags/{productId}/detach-tag
  detachTags(productId: string, tag_ids: string[]): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.BASE}/store/tags/${productId}/detach-tag`,
      { body: { tag_ids } }
    );
  }

  // GET /store/features
  getFeatures(): Observable<FeaturesResponse> {
    return this.http.get<FeaturesResponse>(`${this.BASE}/store/features`);
  }

  // POST /store/features/create/{productId}
  createFeature(productId: string, name: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/features/create/${productId}`, { name }
    );
  }

  // POST /store/features/{productId}/attach-feature
  attachFeatures(
    productId: string, feature_ids: string[]
  ): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/store/features/${productId}/attach-feature`,
      { feature_ids }
    );
  }

  // DELETE /store/features/{productId}/detach-feature
  detachFeatures(
    productId: string, feature_ids: string[]
  ): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.BASE}/store/features/${productId}/detach-feature`,
      { body: { feature_ids } }
    );
  }

  // PUT /store/tags/update/{id}  |  DELETE /store/tags/delete/{id}
  updateTag(id: string, name: string): Observable<any> {
    return this.http.put<any>(`${this.BASE}/store/tags/update/${id}`, { name });
  }

  deleteTag(id: string): Observable<any> {
    return this.http.delete<any>(`${this.BASE}/store/tags/delete/${id}`);
  }

  // PUT /store/features/update/{id}  |  DELETE /store/features/delete/{id}
  updateFeature(id: string, name: string): Observable<any> {
    return this.http.put<any>(`${this.BASE}/store/features/update/${id}`, { name });
  }

  deleteFeature(id: string): Observable<any> {
    return this.http.delete<any>(`${this.BASE}/store/features/delete/${id}`);
  }

  // GET /store/colors/{id}  |  GET /store/sizes/{id}
  getColorById(id: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/store/colors/${id}`);
  }

  getSizeById(id: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/store/sizes/${id}`);
  }

  // GET /store/products/{slug}/related
  getRelatedProducts(slug: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/store/products/${slug}/related`);
  }
}


