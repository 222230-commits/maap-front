import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MerchantService, MerchantOrder } from '@core/services/merchant.service';

export type OrderTab = 'all' | 'pending' | 'preparing' | 'completed' | 'cancelled';

export interface NormalizedMerchantOrder {
  id: string | number;
  orderCode: string;
  buyerName: string;
  buyerPhone: string;
  productName: string;
  itemsCount: number;
  totalPrice: number;
  date: string;
  status: string;
  paymentMethod: string;
  raw: MerchantOrder;
}

@Component({
  selector: 'app-merchant-orders',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
  private merchantService = inject(MerchantService);
  private route           = inject(ActivatedRoute);
  public  router          = inject(Router);

  isLoading = signal(true);
  error     = signal('');
  activeOrderTab = signal<OrderTab>('all');
  searchQuery    = signal('');

  allOrders = signal<MerchantOrder[]>([]);

  tabsCount = signal<{
    all: number;
    pending: number;
    preparing: number;
    completed: number;
    cancelled: number;
  }>({
    all: 0,
    pending: 0,
    preparing: 0,
    completed: 0,
    cancelled: 0
  });

  // Action status
  statusSuccess = signal('');
  statusError = signal('');
  isUpdatingStatus = signal(false);

  // Cancellation modal
  showCancelModal = signal(false);
  orderToCancel   = signal<NormalizedMerchantOrder | null>(null);
  cancelReason    = signal('المنتج غير متوفر حالياً');

  // Quick detail modal
  showOrderDetail = signal(false);
  selectedOrder   = signal<NormalizedMerchantOrder | null>(null);

  normalizedOrders = computed(() => {
    return this.allOrders().map(o => this.normalizeOrder(o));
  });

  orders = computed(() => {
    const tab   = this.activeOrderTab();
    const query = this.searchQuery().trim().toLowerCase();
    let list = this.normalizedOrders();

    // 1. تصفية حسب التبويب
    if (tab === 'pending') {
      list = list.filter(o => ['pending', 'new', 'waiting_buyer'].includes(o.status));
    } else if (tab === 'preparing') {
      list = list.filter(o => ['preparing', 'awaiting', 'ready'].includes(o.status));
    } else if (tab === 'completed') {
      list = list.filter(o => o.status === 'completed');
    } else if (tab === 'cancelled') {
      list = list.filter(o => o.status === 'cancelled');
    }

    // 2. تصفية حسب البحث
    if (query) {
      list = list.filter(o =>
        o.orderCode.toLowerCase().includes(query) ||
        o.buyerName.toLowerCase().includes(query) ||
        o.productName.toLowerCase().includes(query) ||
        ('' + o.id).toLowerCase().includes(query)
      );
    }

    return list;
  });

  ngOnInit(): void {
    const queryTab = this.route.snapshot.queryParamMap.get('tab') as OrderTab | null;
    if (queryTab && ['all', 'pending', 'preparing', 'completed', 'cancelled'].includes(queryTab)) {
      this.activeOrderTab.set(queryTab);
    }
    this.loadOrders(this.activeOrderTab());
  }

  loadOrders(tab: OrderTab = this.activeOrderTab()): void {
    this.isLoading.set(true);
    this.error.set('');

    const apiTab = tab === 'pending' ? 'new' : tab;
    this.merchantService.getOrders(apiTab).subscribe({
      next: (res) => {
        const rawList: MerchantOrder[] = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.data ?? [];

        this.allOrders.set(rawList);

        if (res.tabs_count) {
          const tc = res.tabs_count;
          this.tabsCount.set({
            all: tc.all ?? rawList.length,
            pending: tc.new ?? tc.pending ?? 0,
            preparing: (tc.preparing ?? 0) + (tc.awaiting ?? 0),
            completed: tc.completed ?? 0,
            cancelled: tc.cancelled ?? 0
          });
        } else {
          this.recomputeLocalTabsCount(rawList);
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('فشل تحميل الطلبات');
        this.isLoading.set(false);
      }
    });
  }

  changeOrderTab(tab: OrderTab): void {
    this.activeOrderTab.set(tab);
    this.loadOrders(tab);
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value || '');
  }

  normalizeOrder(order: any): NormalizedMerchantOrder {
    const buyerName = order.buyer?.full_name
      || order.buyer_details?.full_name
      || order.buyerName
      || order.buyer?.name
      || 'مشتري';

    const buyerPhone = order.buyer?.phone_number
      || order.buyer_details?.phone_number
      || order.buyerPhone
      || '';

    const firstItem = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : null;
    const productName = firstItem?.product?.title
      || firstItem?.product_title
      || order.productName
      || (order.items?.length ? `طلب يحتوي على ${order.items.length} منتجات` : 'طلب متجر');

    const totalPrice = Number(order.total_price ?? order.price ?? 0);
    const date = order.created_at || order.order_date || order.date || '';
    const orderCode = order.order_code || order.order_number || ('#' + ('' + order.id).slice(0, 8));

    return {
      id: order.id,
      orderCode,
      buyerName,
      buyerPhone,
      productName,
      itemsCount: order.items?.length || 1,
      totalPrice,
      date,
      status: order.status || 'pending',
      paymentMethod: order.payment_method || 'الدفع عند الاستلام',
      raw: order
    };
  }

  private recomputeLocalTabsCount(list: MerchantOrder[]): void {
    const pending   = list.filter(o => ['pending', 'new', 'waiting_buyer'].includes(o.status)).length;
    const preparing = list.filter(o => ['preparing', 'awaiting', 'ready'].includes(o.status)).length;
    const completed = list.filter(o => o.status === 'completed').length;
    const cancelled = list.filter(o => o.status === 'cancelled').length;
    this.tabsCount.set({
      all: list.length,
      pending,
      preparing,
      completed,
      cancelled
    });
  }

  goToOrderDetail(id: string | number): void {
    this.router.navigate(['/merchant/orders', id]);
  }

  viewQuickDetail(order: NormalizedMerchantOrder, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedOrder.set(order);
    this.showOrderDetail.set(true);
    this.statusSuccess.set('');
    this.statusError.set('');
  }

  closeQuickDetail(): void {
    this.showOrderDetail.set(false);
    this.selectedOrder.set(null);
  }

  markOrderReady(order: NormalizedMerchantOrder, event?: Event): void {
    if (event) event.stopPropagation();
    this.isUpdatingStatus.set(true);
    this.merchantService.markOrderReady(order.id).subscribe({
      next: () => {
        this.statusSuccess.set(`تم تحديد الطلب ${order.orderCode} كجاهز بنجاح`);
        this.updateLocalOrderStatus(order.id, 'completed');
        this.isUpdatingStatus.set(false);
        setTimeout(() => this.statusSuccess.set(''), 3000);
      },
      error: () => {
        this.merchantService.updateOrderStatus(order.id, 'completed').subscribe({
          next: () => {
            this.statusSuccess.set(`تم تحديد الطلب ${order.orderCode} كجاهز بنجاح`);
            this.updateLocalOrderStatus(order.id, 'completed');
            this.isUpdatingStatus.set(false);
            setTimeout(() => this.statusSuccess.set(''), 3000);
          },
          error: () => {
            this.statusError.set('فشل تحديث حالة الطلب');
            this.isUpdatingStatus.set(false);
            setTimeout(() => this.statusError.set(''), 3000);
          }
        });
      }
    });
  }

  openCancelModal(order: NormalizedMerchantOrder, event?: Event): void {
    if (event) event.stopPropagation();
    this.orderToCancel.set(order);
    this.cancelReason.set('المنتج غير متوفر حالياً');
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
    this.orderToCancel.set(null);
  }

  confirmCancelOrder(): void {
    const order = this.orderToCancel();
    if (!order) return;

    this.isUpdatingStatus.set(true);
    this.merchantService.cancelOrderAsSeller(order.id, this.cancelReason()).subscribe({
      next: () => {
        this.statusSuccess.set(`تم إلغاء الطلب ${order.orderCode} بنجاح`);
        this.updateLocalOrderStatus(order.id, 'cancelled');
        this.closeCancelModal();
        this.isUpdatingStatus.set(false);
        setTimeout(() => this.statusSuccess.set(''), 3000);
      },
      error: () => {
        this.merchantService.updateOrderStatus(order.id, 'cancelled').subscribe({
          next: () => {
            this.statusSuccess.set(`تم إلغاء الطلب ${order.orderCode} بنجاح`);
            this.updateLocalOrderStatus(order.id, 'cancelled');
            this.closeCancelModal();
            this.isUpdatingStatus.set(false);
            setTimeout(() => this.statusSuccess.set(''), 3000);
          },
          error: () => {
            this.statusError.set('فشل إلغاء الطلب، يرجى المحاولة لاحقاً');
            this.isUpdatingStatus.set(false);
            setTimeout(() => this.statusError.set(''), 3000);
          }
        });
      }
    });
  }

  private updateLocalOrderStatus(id: string | number, newStatus: string): void {
    this.allOrders.update(orders =>
      orders.map(o => o.id === id ? { ...o, status: newStatus } : o)
    );
    this.recomputeLocalTabsCount(this.allOrders());
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('ar-LY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr || '';
    }
  }

  getOrderStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:       'بانتظار المراجعة',
      new:           'طلب جديد',
      waiting_buyer: 'بانتظار الزبون',
      preparing:     'قيد التجهيز',
      awaiting:      'بانتظار الاستلام',
      ready:         'جاهز للاستلام',
      completed:     'مكتمل',
      cancelled:     'ملغي',
      confirmed:     'مؤكد'
    };
    return map[status] ?? status;
  }

  getOrderStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending:       'status-pending',
      new:           'status-pending',
      waiting_buyer: 'status-waiting',
      preparing:     'status-preparing',
      awaiting:      'status-awaiting',
      ready:         'status-ready',
      completed:     'status-completed',
      cancelled:     'status-cancelled',
      confirmed:     'status-confirmed'
    };
    return map[status] ?? 'status-pending';
  }
}
