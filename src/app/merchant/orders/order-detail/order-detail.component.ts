import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  MerchantService,
  SellerOrderInvoice,
  SellerOrderItem
} from '@core/services/merchant.service';

@Component({
  selector: 'app-order-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './order-detail.component.html',
  styleUrl:    './order-detail.component.scss'
})
export class OrderDetailComponent implements OnInit {
  private merchantService = inject(MerchantService);
  private route           = inject(ActivatedRoute);
  public  router          = inject(Router);

  // ── الحالة الأساسية ──
  isLoading      = signal(true);
  error          = signal('');
  invoice        = signal<SellerOrderInvoice | null>(null);
  orderId        = signal('');
  successMessage = signal('');

  // ── وضع المراجعة (Review Mode) ──
  isReviewMode       = signal(false);
  reviewSelections   = signal<Map<string, boolean>>(new Map());
  isSubmittingReview = signal(false);

  // ── تحويل جاهز ──
  isMarkingReady = signal(false);

  // ── مودال الإلغاء ──
  showCancelModal = signal(false);
  cancelReason    = signal('');
  isCancelling    = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.orderId.set(id);
    this.loadOrder();
  }

  loadOrder(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.merchantService.getSellerOrderDetails(this.orderId()).subscribe({
      next: (res) => {
        this.invoice.set(res.invoice);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'الطلب غير موجود أو لا يتبع متجرك');
        this.isLoading.set(false);
      }
    });
  }

  // ── Review Mode ─────────────────────────────────────
  startReview(): void {
    this.isReviewMode.set(true);
    const initial = new Map<string, boolean>();
    this.invoice()?.items.forEach(item => initial.set(item.item_id, true));
    this.reviewSelections.set(initial);
  }

  toggleItemAvailability(itemId: string): void {
    this.reviewSelections.update(map => {
      const newMap = new Map(map);
      newMap.set(itemId, !newMap.get(itemId));
      return newMap;
    });
  }

  submitReview(): void {
    const selections = this.reviewSelections();
    const items = Array.from(selections.entries()).map(([id, is_available]) => ({ id, is_available }));
    this.isSubmittingReview.set(true);
    this.merchantService.reviewOrderItems(this.orderId(), items).subscribe({
      next: () => {
        this.isSubmittingReview.set(false);
        this.isReviewMode.set(false);
        this.successMessage.set('تم إرسال المراجعة بنجاح');
        setTimeout(() => this.successMessage.set(''), 3000);
        // الباك إند لا يعيد الحالة الجديدة في هذا الرد — يجب إعادة الجلب
        this.loadOrder();
      },
      error: () => {
        this.isSubmittingReview.set(false);
        this.error.set('تعذر إرسال المراجعة، حاول مرة أخرى');
      }
    });
  }

  // ── جاهز للاستلام ────────────────────────────────────
  markReady(): void {
    this.isMarkingReady.set(true);
    this.merchantService.markOrderReady(this.orderId()).subscribe({
      next: () => {
        this.isMarkingReady.set(false);
        this.successMessage.set('تم تحويل الطلب لانتظار استلام الزبون');
        setTimeout(() => this.successMessage.set(''), 3000);
        this.loadOrder();
      },
      error: () => {
        this.isMarkingReady.set(false);
        this.error.set('تعذر تحويل الطلب، تأكد أن حالته قيد التجهيز فعلاً');
      }
    });
  }

  // ── مودال الإلغاء ────────────────────────────────────
  openCancelModal(): void  { this.showCancelModal.set(true); }
  closeCancelModal(): void { this.showCancelModal.set(false); this.cancelReason.set(''); }

  confirmCancel(): void {
    this.isCancelling.set(true);
    this.merchantService.cancelOrderAsSeller(this.orderId(), this.cancelReason()).subscribe({
      next: () => {
        this.isCancelling.set(false);
        this.showCancelModal.set(false);
        this.router.navigate(['/merchant/orders']);
      },
      error: (err) => {
        this.isCancelling.set(false);
        this.error.set(err?.error?.message || 'تعذر إلغاء الطلب');
      }
    });
  }

  // ── مساعدات عرض ─────────────────────────────────────
  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:       'بانتظار المراجعة',
      waiting_buyer: 'بانتظار موافقة الزبون',
      preparing:     'قيد التجهيز',
      awaiting:      'بانتظار الاستلام',
      completed:     'مكتمل',
      cancelled:     'ملغي',
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending:       'badge-pending',
      waiting_buyer: 'badge-waiting',
      preparing:     'badge-preparing',
      awaiting:      'badge-awaiting',
      completed:     'badge-completed',
      cancelled:     'badge-cancelled',
    };
    return map[status] ?? '';
  }

  getAvailabilityLabel(av: SellerOrderItem['availability']): string {
    return av === 'available' ? 'متوفر' : av === 'unavailable' ? 'غير متوفر' : 'قيد المراجعة';
  }

  formatPrice(v: number): string {
    return v.toLocaleString('ar-LY') + ' د.ل';
  }

  getShippingText(addr: Record<string, string> | null): string {
    if (!addr) return 'غير محدد';
    return [addr['street'], addr['city'], addr['details']].filter(Boolean).join('، ');
  }
}
