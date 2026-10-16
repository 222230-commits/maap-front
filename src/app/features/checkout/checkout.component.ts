import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '@core/services/order.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-checkout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit {
  private orderService = inject(OrderService);
  private cartService  = inject(CartService);
  private route        = inject(ActivatedRoute);
  public  router       = inject(Router);

  isLoading             = signal(true);
  error                 = signal('');
  isSubmitting          = signal(false);
  checkoutData          = signal<any>(null);
  selectedPaymentMethod = signal('Cash on Delivery');
  shippingAddress       = signal('');
  shopId                = signal('');

  // Step: 1=preview, 2=success
  step = signal<1 | 2>(1);
  placedOrder = signal<any>(null);
  copiedOrderNumber = signal(false);

  otherShopsCount = computed(() => {
    return this.cartService.shops().filter(s => s.shop_id !== this.shopId()).length;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('shopId') ?? '';
    this.shopId.set(id);
    if (!id) {
      this.error.set('لم يتم تحديد المتجر — الرجوع للسلة');
      this.isLoading.set(false);
      return;
    }
    this.loadPreview();
  }

  loadPreview(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.orderService.getCheckoutPreview(this.shopId()).subscribe({
      next: (res) => {
        // API قد يُرجع البيانات تحت data أو checkout_data
        const data = res?.data ?? res?.checkout_data ?? res;
        this.checkoutData.set(data);
        // تعبئة العنوان المحفوظ إن وُجد
        const saved = data?.customer?.saved_addresses ?? data?.customer?.address ?? '';
        if (typeof saved === 'string' && saved) this.shippingAddress.set(saved);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        const msg = err?.error?.message
          ?? err?.error?.error
          ?? 'لا توجد منتجات في سلتك تابعة لهذا المتجر، يرجى إضافة منتجات أولاً';
        this.error.set(msg);
        this.isLoading.set(false);
      }
    });
  }

  selectPayment(methodId: string, isAvailable: boolean): void {
    if (!isAvailable) return;
    this.selectedPaymentMethod.set(methodId);
  }

  submitOrder(): void {
    if (!this.shippingAddress().trim()) {
      this.error.set('يرجى إدخال عنوان الشحن');
      return;
    }
    this.isSubmitting.set(true);
    this.error.set('');
    this.orderService.createOrder({
      shop_id: this.shopId(),
      shipping_address: this.shippingAddress().trim(),
      payment_method: this.selectedPaymentMethod()
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        const order = Array.isArray(res.data) ? res.data[0] : res.data;
        this.placedOrder.set(order);
        this.step.set(2);
        // تحديث السلة
        this.cartService.loadCart().subscribe();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.error.set(err?.error?.message || 'حدث خطأ غير متوقع أثناء إتمام الطلب');
      }
    });
  }

  goToOrder(): void {
    const order = this.placedOrder();
    if (order?.id) {
      this.router.navigate(['/orders', order.id]);
    } else {
      this.router.navigate(['/orders']);
    }
  }

  formatPrice(price: number): string {
    return (+price).toLocaleString('ar-LY') + ' د.ل';
  }

  copyOrderId(id: string): void {
    if (!id) return;
    navigator.clipboard?.writeText(id).then(() => {
      this.copiedOrderNumber.set(true);
      setTimeout(() => this.copiedOrderNumber.set(false), 2500);
    });
  }

  goToNextShopInCart(): void {
    const remaining = this.cartService.shops().filter(s => s.shop_id !== this.shopId());
    if (remaining.length > 0) {
      this.router.navigate(['/checkout', remaining[0].shop_id]);
    } else {
      this.router.navigate(['/cart']);
    }
  }
}
