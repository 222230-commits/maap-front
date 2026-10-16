import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// المسارات التي لا يجب إرسال التوكن معها مطلقاً (مسارات الدخول والتسجيل العام)
const GUEST_AUTH_PATTERNS = [
  '/auth/login',
  '/auth/register',
  '/auth/admin-login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-otp',
];

// مسارات قراءة عامة بحتة (GET فقط) قد تسبب 500 في الباكيند إذا أُرسل معها توكن منتهي
const PUBLIC_READONLY_PATTERNS = [
  '/api/Buyer/products',
  '/api/Buyer/Categories',
  '/api/products',
  '/api/shops',
  '/api/categories',
  '/api/search',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = localStorage.getItem('access_token');
  const url = req.url;

  // مسار توصيات الرئيسية يستفيد من التوكن اختيارياً لتخصيص النتائج
  const isRecommendationsHome = url.includes('/recommendations/home');

  // مسارات المشتري المحمية (سلة، مفضلة، طلبات، متابعة، بروفايل) — تتطلب توكن حتماً
  const isProtectedBuyerEndpoint = 
    url.includes('/cart') ||
    url.includes('/Wishlist') ||
    url.includes('/orders') ||
    url.includes('/checkout') ||
    url.includes('/follow') ||
    url.includes('/unfollow') ||
    url.includes('/Buyer/profile');

  // مسارات التاجر والإدارة دائماً محمية
  const isProtectedRoleEndpoint =
    url.includes('/merchant') ||
    url.includes('/admin') ||
    url.includes('/store/products') ||
    url.includes('/store/orders') ||
    url.includes('/store/settings') ||
    url.includes('/notifications') ||
    url.includes('/reports');

  // أي طلب غير GET (مثل POST/PUT/DELETE) في نظام المتجر يتطلب توكن
  const isMutation = req.method !== 'GET';

  // هل المسار مخصص للضيوف فقط (auth endpoints)
  const isGuestAuth = GUEST_AUTH_PATTERNS.some(p => url.includes(p));

  // هل هو مسار قراءة عام بحت
  const isPublicRead = req.method === 'GET' && 
                       PUBLIC_READONLY_PATTERNS.some(p => url.includes(p)) && 
                       !isProtectedBuyerEndpoint;

  const headers: Record<string, string> = { Accept: 'application/json' };

  if (token && !isGuestAuth) {
    if (isProtectedBuyerEndpoint || isProtectedRoleEndpoint || isMutation || isRecommendationsHome || !isPublicRead) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return next(req.clone({ setHeaders: headers })).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 403 || err.status === 401) {
          const rawMsg = err.error?.message || err.error?.error || '';
          const msg = (typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg)).toLowerCase();

          // إذا كان الطلب مرسلاً مع توكن (مستخدم مسجل دخول) ورُفض بـ 401 أو 403
          if (token && !isGuestAuth) {
            // التحقق: إذا كان الخطأ متعلقاً بمتجر موقوف، لا يحظر المشتري إطلاقاً
            const isShopRelated =
              msg.includes('متجر') ||
              msg.includes('shop') ||
              url.includes('/shops') ||
              url.includes('/store/shops');

            if (!isShopRelated) {
              const isUserBanned =
                msg.includes('حظر المستخدم') ||
                msg.includes('حسابك محظور') ||
                msg.includes('حسابك موقوف') ||
                msg.includes('user banned') ||
                msg.includes('user is banned') ||
                msg.includes('user inactive') ||
                (err.status === 403 && (msg.includes('banned') || msg.includes('حظر')));

              if (isUserBanned) {
                const reasonText = (typeof rawMsg === 'string' && rawMsg)
                  ? rawMsg
                  : 'تم إيقاف حسابك من قِبل إدارة المنصة.';
                authService.handleBannedUser(reasonText);
              }
            }
          }
        }
      }
      return throwError(() => err);
    })
  );
};
