import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  template: `
    <div class="not-found-page">
      <div class="not-found-content">
        <div class="not-found-number">404</div>
        <div class="not-found-icon">
          <i class="fas fa-map-signs"></i>
        </div>
        <h1>الصفحة غير موجودة</h1>
        <p>
          يبدو أن هذه الصفحة لا وجود لها أو تم نقلها.
          دعنا نعيدك للصفحة الرئيسية.
        </p>
        <div class="not-found-actions">
          <button class="btn-home" (click)="router.navigate(['/'])">
            <i class="fas fa-home"></i> العودة للرئيسية
          </button>
          <button class="btn-products" (click)="router.navigate(['/products'])">
            <i class="fas fa-shopping-bag"></i> تصفح المنتجات
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-page { min-height: 100vh; background: linear-gradient(135deg, #1A0030 0%, #3A004D 50%, #6B2D8B 100%); display: flex; align-items: center; justify-content: center; padding: 24px; direction: rtl; }
    .not-found-content { text-align: center; color: white; max-width: 480px; }
    .not-found-number { font-family: 'Inter', sans-serif; font-size: 8rem; font-weight: 900; line-height: 1; background: linear-gradient(135deg, #E8D5F5, #C084FC); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 8px; letter-spacing: -4px; }
    .not-found-icon { font-size: 48px; color: rgba(255,255,255,0.3); margin-bottom: 24px; }
    .not-found-content h1 { font-family: 'Tajawal', sans-serif; font-size: 1.75rem; font-weight: 800; margin: 0 0 14px; }
    .not-found-content p { font-family: 'Tajawal', sans-serif; font-size: 1rem; opacity: 0.75; margin: 0 0 36px; line-height: 1.7; }
    .not-found-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .btn-home { display: flex; align-items: center; gap: 8px; background: white; color: #3A004D; border: none; padding: 13px 28px; border-radius: 12px; font-family: 'Tajawal', sans-serif; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    .btn-home:hover { background: #F0E8FF; transform: translateY(-2px); }
    .btn-products { display: flex; align-items: center; gap: 8px; background: transparent; color: white; border: 1.5px solid rgba(255,255,255,0.4); padding: 13px 28px; border-radius: 12px; font-family: 'Tajawal', sans-serif; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-products:hover { border-color: white; background: rgba(255,255,255,0.1); }
  `]
})
export class NotFoundComponent {
  public router = inject(Router);
}
