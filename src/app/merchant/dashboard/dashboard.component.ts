import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MerchantService, MerchantDashboardResponse } from '../../core/services/merchant.service';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { ReportExportService } from '../../core/services/report-export.service';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private merchantService = inject(MerchantService);
  private productService  = inject(ProductService);
  private reportExportService = inject(ReportExportService);
  public router = inject(Router);
  public authService = inject(AuthService);

  isLoading = signal(true);
  isExporting = signal(false);
  error = signal('');
  isSuspended = signal(false);
  showSuspendedModal = signal(false);
  isNonMerchant = signal(false);
  dashData = signal<MerchantDashboardResponse['data'] | null>(null);
  stockAlerts = signal<{ low_stock: number; out_of_stock: number }>({ low_stock: 0, out_of_stock: 0 });

  animatedCards = signal({
    products: 0,
    followers: 0,
    total_orders: 0,
    completed: 0
  });

  ngOnInit(): void {
    const role = this.authService.role();
    if (role === 'admin') {
      this.isNonMerchant.set(true);
      this.error.set('أنت مسجل حالياً كمدير نظام (Admin) وليس كتاجر.');
      this.isLoading.set(false);
      return;
    }

    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.error.set('');

    this.merchantService.getDashboard().subscribe({
      next: (res) => {
        this.dashData.set(res.data);
        this.isLoading.set(false);
        if (res.data?.shop_info && !res.data.shop_info.is_active) {
          this.isSuspended.set(true);
          this.showSuspendedModal.set(true);
        }
        if (res.data?.cards) {
          this.animateNumbers(res.data.cards);
        }
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        const httpErr = err as { status?: number; error?: { message?: string; error?: string } };
        const rawMsg = httpErr?.error?.message || httpErr?.error?.error || '';
        const msg = (typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg)).toLowerCase();

        const isSuspendedError =
          httpErr?.status === 403 ||
          httpErr?.status === 401 ||
          msg.includes('موقوف') ||
          msg.includes('معلق') ||
          msg.includes('تجميد') ||
          msg.includes('suspended') ||
          msg.includes('inactive') ||
          msg.includes('shop');

        if (isSuspendedError) {
          this.isSuspended.set(true);
          this.showSuspendedModal.set(true);
          this.error.set('تم إيقاف نشاط متجرك إدارياً من قِبل إدارة المنصة.');
        } else {
          this.error.set('فشل تحميل بيانات لوحة التحكم. يُرجى التحقق من الاتصال والمحاولة لاحقاً.');
        }
      }
    });

    this.productService.getProducts('all').subscribe({
      next: (res) => {
        if (res?.data?.stats) {
          this.stockAlerts.set({
            low_stock: res.data.stats.low_stock || 0,
            out_of_stock: res.data.stats.out_of_stock || 0
          });
        }
      },
      error: () => {}
    });
  }

  closeSuspendedModal(): void {
    this.showSuspendedModal.set(false);
  }

  retry(): void {
    this.loadDashboard();
  }

  animateNumbers(cards: any): void {
    const map = [
      { key: 'products', val: cards.products_count },
      { key: 'followers', val: cards.followers_count },
      { key: 'total_orders', val: cards.total_orders },
      { key: 'completed', val: cards.completed_orders }
    ];
    
    map.forEach(({ key, val }) => {
      let cur = 0;
      const step = Math.ceil(val / 30) || 1;
      const iv = setInterval(() => {
        cur = Math.min(cur + step, val);
        this.animatedCards.update(s => ({ ...s, [key]: cur }));
        if (cur >= val) clearInterval(iv);
      }, 50);
    });
  }

  goTo(path: string): void {
    this.router.navigate([path]);
  }

  async exportDocxReport(): Promise<void> {
    const data = this.dashData();
    if (!data || this.isExporting() || this.isLoading()) return;
    this.isExporting.set(true);
    try {
      await this.reportExportService.exportMerchantDashboardDocx({
        shopInfo: data.shop_info ? {
          name: data.shop_info.name,
          is_active: data.shop_info.is_active,
          status_text: data.shop_info.status_text
        } : null,
        rating: data.general_rating,
        cards: {
          products: data.cards.products_count,
          followers: data.cards.followers_count,
          total_orders: data.cards.total_orders,
          completed: data.cards.completed_orders
        },
        stockAlerts: this.stockAlerts(),
        analytics: data.analytics_and_growth ? {
          highest_sales_day: data.analytics_and_growth.highest_sales_day,
          most_active_month: data.analytics_and_growth.most_active_month,
          order_growth: data.analytics_and_growth.order_growth
        } : null,
        orderChart: data.order_analytics_chart ? {
          completed_percent: data.order_analytics_chart.completed_percent,
          pending_percent: data.order_analytics_chart.pending_percent
        } : null,
        merchantName: this.authService.currentUser()?.full_name || 'تاجر مآب'
      });
    } catch (err) {
      console.error('Failed to export merchant report', err);
    } finally {
      this.isExporting.set(false);
    }
  }
}
