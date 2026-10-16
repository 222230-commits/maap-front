import { Component, inject, signal, OnInit, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BuyerService } from '@core/services/buyer.service';
import { AuthService }  from '@core/services/auth.service';
import { LoginPromptComponent } from '../../../shared/components/login-prompt/login-prompt.component';
import { ReportModalComponent } from '@shared/components/report-modal/report-modal.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-store-profile',
  imports: [CommonModule, RouterModule, LoginPromptComponent, ReportModalComponent],
  templateUrl: './store-profile.component.html',
  styleUrl: './store-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreProfileComponent implements OnInit {
  private buyerService = inject(BuyerService);
  public  authService  = inject(AuthService);
  private route        = inject(ActivatedRoute);
  protected router     = inject(Router);

  shopId            = signal('');
  shop              = signal<any>(null);
  shopProducts      = signal<any[]>([]);
  isLoadingShop     = signal(true);
  isLoadingProducts = signal(true);
  isFollowing       = signal(false);
  isTogglingFollow  = signal(false);
  showLoginPrompt   = signal(false);

  // ── Report ──
  showReportModal    = signal(false);
  showReportDialog   = signal(false);
  reportReason       = signal('');
  isSubmittingReport = signal(false);
  reportMsg          = signal('');

  @ViewChild(ReportModalComponent)
  reportModal!: ReportModalComponent;

  ngOnInit(): void {
    this.route.params.subscribe(p => {
      const id = p['id'] as string;
      this.shopId.set(id);
      this.loadShop(id);
      this.loadShopProducts(id);
    });
  }

  loadShop(id: string): void {
    this.isLoadingShop.set(true);
    this.buyerService.getShopById(id).subscribe({
      next: (res) => {
        const shopData = res.data ?? res;
        this.shop.set(shopData);
        if (shopData?.is_following !== undefined) {
          this.isFollowing.set(!!shopData.is_following);
        }
        this.isLoadingShop.set(false);
      },
      error: () => this.isLoadingShop.set(false)
    });
  }

  loadShopProducts(shopId: string): void {
    this.isLoadingProducts.set(true);
    this.buyerService.getShopProducts(shopId).subscribe({
      next: (res) => {
        const items = res?.data?.data ?? res?.data ?? [];
        this.shopProducts.set(Array.isArray(items) ? items : []);
        this.isLoadingProducts.set(false);
      },
      error: () => this.isLoadingProducts.set(false)
    });
  }

  toggleFollow(): void {
    if (this.authService.role() === 'admin') return;
    if (this.authService.isBanned()) {
      alert('حسابك موقوف من قِبل إدارة المنصة.');
      return;
    }
    if (this.shop()?.is_active === false) {
      alert('هذا المتجر موقوف حالياً من قِبل إدارة المنصة.');
      return;
    }
    if (!this.authService.isLoggedIn()) {
      this.showLoginPrompt.set(true);
      return;
    }
    const id = this.shopId();
    if (!id || this.isTogglingFollow()) return;

    this.isTogglingFollow.set(true);
    if (this.isFollowing()) {
      this.buyerService.unfollowShop(id).subscribe({
        next: () => { this.isFollowing.set(false); this.isTogglingFollow.set(false); },
        error: () => this.isTogglingFollow.set(false)
      });
    } else {
      this.buyerService.followShop(id).subscribe({
        next: () => { this.isFollowing.set(true); this.isTogglingFollow.set(false); },
        error: () => this.isTogglingFollow.set(false)
      });
    }
  }

  openReport(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.reportModal.open(
      'store',
      this.shop()?.id ?? '',
      this.shop()?.name ?? 'هذا المتجر'
    );
  }

  submitReport(): void {
    const shopData = this.shop();
    if (!shopData?.id || !this.reportReason().trim()) return;
    this.isSubmittingReport.set(true);
    this.buyerService.submitReport('shop', shopData.id, this.reportReason()).subscribe({
      next: () => {
        this.isSubmittingReport.set(false);
        this.showReportDialog.set(false);
        this.reportReason.set('');
        this.reportMsg.set('✓ تم إرسال البلاغ بنجاح');
        setTimeout(() => this.reportMsg.set(''), 4000);
      },
      error: () => {
        this.isSubmittingReport.set(false);
        this.reportMsg.set('حدث خطأ أثناء إرسال البلاغ');
        setTimeout(() => this.reportMsg.set(''), 3000);
      }
    });
  }

  private readonly serverBase = environment.apiUrl.replace('/api', '');

  getImageUrl(url: string | null | undefined): string {
    if (!url || url.trim() === '') return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return this.serverBase + (url.startsWith('/') ? '' : '/') + url;
  }

  /** يستخلص URL الصورة من بيانات المنتج (API تعيد object ليس string) */
  getProductImage(product: any): string {
    // primary_image هو object { id, image_url }
    if (product?.primary_image?.image_url) {
      return this.getImageUrl(product.primary_image.image_url);
    }
    // images[] array
    if (product?.images?.length) {
      const primary = product.images.find((img: any) => img.is_primary);
      const url = (primary ?? product.images[0])?.image_url ?? '';
      return this.getImageUrl(url);
    }
    // colors[0].images[0]
    if (product?.colors?.length && product.colors[0]?.images?.length) {
      return this.getImageUrl(product.colors[0].images[0].image_url ?? '');
    }
    return '';
  }

  /** تنقل لصفحة المنتج مع تمرير بيانات المنتج عبر state لتجنب API call */
  navigateToProduct(product: any): void {
    const slug = product.slug ?? product.id;
    const isMerchant = this.authService.role() === 'merchant';
    // نمرر المنتج عبر state حتى تعرضه صفحة التفاصيل مباشرة بدون API call
    if (isMerchant && product.id) {
      this.router.navigate(['/products', slug], {
        state: { product },
        queryParams: { mid: product.id }
      });
    } else {
      this.router.navigate(['/products', slug], { state: { product } });
    }
  }

}
