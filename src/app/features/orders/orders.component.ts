import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OrderService, Order } from '@core/services/order.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-orders',  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private authService  = inject(AuthService);
  public  router       = inject(Router);

  isLoading           = signal(true);
  error               = signal('');
  orders              = signal<Order[]>([]);
  activeTab           = signal<'all' | 'pending' | 'preparing' | 'awaiting' | 'completed' | 'cancelled'>('all');
  confirmingId        = signal<string | null>(null);
  cancellingId        = signal<string | null>(null);
  confirmModalOrderId = signal<string | null>(null);
  cancelModalOrderId  = signal<string | null>(null);
  cancelReason        = signal('');
  successMessage      = signal('');

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.orderService.getOrders(this.activeTab()).subscribe({
      next: (res) => {
        this.orders.set(res.data.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('فشل تحميل الطلبات');
        this.isLoading.set(false);
      }
    });
  }

  changeTab(tab: 'all' | 'pending' | 'preparing' | 'awaiting' | 'completed' | 'cancelled'): void {
    this.activeTab.set(tab);
    this.loadOrders();
  }

  promptConfirmReceipt(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.confirmModalOrderId.set(id);
  }

  closeConfirmModal(): void {
    this.confirmModalOrderId.set(null);
  }

  executeConfirmReceipt(): void {
    const id = this.confirmModalOrderId();
    if (!id) return;
    this.confirmingId.set(id);
    this.orderService.confirmReceipt(id).subscribe({
      next: (res) => {
        this.confirmingId.set(null);
        this.confirmModalOrderId.set(null);
        this.successMessage.set(res?.message || 'تم تأكيد الاستلام بنجاح، واكتمل الطلب في سجلك');
        setTimeout(() => this.successMessage.set(''), 3500);
        this.loadOrders();
      },
      error: (err: any) => {
        this.confirmingId.set(null);
        this.confirmModalOrderId.set(null);
        this.error.set(err?.error?.message || 'حدث خطأ أثناء تأكيد الاستلام');
        setTimeout(() => this.error.set(''), 4000);
      }
    });
  }

  promptCancelOrder(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.cancelModalOrderId.set(id);
    this.cancelReason.set('');
  }

  closeCancelModal(): void {
    this.cancelModalOrderId.set(null);
    this.cancelReason.set('');
  }

  executeCancelOrder(): void {
    const id = this.cancelModalOrderId();
    if (!id) return;
    this.cancellingId.set(id);
    const reason = this.cancelReason().trim() || undefined;
    this.orderService.cancelOrder(id, reason).subscribe({
      next: (res) => {
        this.cancellingId.set(null);
        this.cancelModalOrderId.set(null);
        this.cancelReason.set('');
        this.successMessage.set(res?.message || 'تم إلغاء الطلب بنجاح');
        setTimeout(() => this.successMessage.set(''), 3500);
        this.loadOrders();
      },
      error: (err: any) => {
        this.cancellingId.set(null);
        this.cancelModalOrderId.set(null);
        this.error.set(err?.error?.message || 'حدث خطأ أثناء إلغاء الطلب');
        setTimeout(() => this.error.set(''), 4000);
      }
    });
  }

  goToDetails(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.router.navigate(['/orders', id]);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatPrice(price: number): string {
    return price.toLocaleString('ar-LY') + ' د.ل';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:       'قيد المعالجة',
      preparing:     'قيد التحضير',
      waiting_buyer: 'بانتظار موافقتك',
      awaiting:      'في انتظار الاستلام',
      completed:     'مكتمل',
      cancelled:     'ملغي',
      confirmed:     'تم التأكيد'
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending:       'badge-pending',
      preparing:     'badge-pending',
      waiting_buyer: 'badge-waiting',
      awaiting:      'badge-active',
      completed:     'badge-approved',
      cancelled:     'badge-banned',
      confirmed:     'badge-active'
    };
    return map[status] ?? '';
  }
}
