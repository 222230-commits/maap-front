import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '@core/services/order.service';
import { AiService } from '@core/services/ai.service';

@Component({
  selector: 'app-order-details',  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.scss'
})
export class OrderDetailsComponent implements OnInit {
  private orderService = inject(OrderService);
  private aiService    = inject(AiService);
  private route        = inject(ActivatedRoute);
  public  router       = inject(Router);

  isLoading          = signal(true);
  error              = signal('');
  invoice            = signal<any>(null);
  isRespondingAccept = signal(false);
  isRespondingReject = signal(false);
  isCancelling       = signal(false);
  isConfirming       = signal(false);
  showCancelModal    = signal(false);
  cancelReason       = signal('');
  successMessage     = signal('');

  // ── Rating ──────────────────────────────────────────────────
  ratingModalProductId   = signal<string | null>(null);
  ratingValue            = signal(0);
  ratingComment          = signal('');
  isSubmittingRating     = signal(false);
  isCheckingComment      = signal(false);
  commentWarning         = signal('');
  ratedProductIds        = signal<Set<string>>(new Set());
  ratingError            = signal<string | null>(null);
  hiddenRatingProductIds = signal<Set<string>>(new Set()); // صاحب المنتج — يُخفى الزر

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadInvoice(id);
  }

  loadInvoice(id: string): void {
    this.isLoading.set(true);
    this.orderService.getOrderDetails(id).subscribe({
      next: (res) => {
        this.invoice.set(res.invoice);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'الطلب غير موجود');
        this.isLoading.set(false);
      }
    });
  }

  respondToReview(accept: boolean): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (accept) this.isRespondingAccept.set(true);
    else this.isRespondingReject.set(true);

    this.orderService.respondReview(id, accept).subscribe({
      next: () => {
        this.isRespondingAccept.set(false);
        this.isRespondingReject.set(false);
        this.successMessage.set(accept ? 'تم اعتماد الطلب للمنتجات المتوفرة' : 'تم رفض الطلب');
        setTimeout(() => this.successMessage.set(''), 3000);
        this.loadInvoice(id);
      },
      error: () => {
        this.isRespondingAccept.set(false);
        this.isRespondingReject.set(false);
        // الباك إند قد يرجع 500 غير منسق هنا حسب التوثيق
        this.error.set('حدث خطأ أثناء تنفيذ العملية، حاول مرة أخرى');
      }
    });
  }

  confirmReceipt(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.isConfirming.set(true);
    this.orderService.confirmReceipt(id).subscribe({
      next: () => {
        this.isConfirming.set(false);
        this.successMessage.set('تم تأكيد الاستلام بنجاح، شكراً لك');
        setTimeout(() => this.successMessage.set(''), 3000);
        this.loadInvoice(id);
      },
      error: () => {
        this.isConfirming.set(false);
        this.error.set('حدث خطأ أثناء تأكيد الاستلام');
      }
    });
  }

  openCancelModal(): void  { this.showCancelModal.set(true); }
  closeCancelModal(): void {
    this.showCancelModal.set(false);
    this.cancelReason.set('');
  }

  confirmCancel(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.isCancelling.set(true);
    this.orderService.cancelOrder(id, this.cancelReason()).subscribe({
      next: () => {
        this.isCancelling.set(false);
        this.showCancelModal.set(false);
        this.router.navigate(['/orders']);
      },
      error: () => {
        this.isCancelling.set(false);
        this.error.set('تعذر إلغاء الطلب');
      }
    });
  }

  formatPrice(price: number): string {
    return price.toLocaleString('ar-LY') + ' د.ل';
  }

  // ── Rating Methods ──────────────────────────────────
  openRatingModal(productId: string): void {
    this.ratingModalProductId.set(productId);
    this.ratingValue.set(0);
    this.ratingComment.set('');
    this.ratingError.set(null);
    this.commentWarning.set('');
    this.isCheckingComment.set(false);
  }

  closeRatingModal(): void { this.ratingModalProductId.set(null); }

  setRating(value: number): void { this.ratingValue.set(value); }

  submitRating(): void {
    if (this.ratingValue() === 0) return;
    const comment = this.ratingComment().trim();
    if (!comment) {
      // بدون تعليق — أرسل مباشرة
      this.doSubmitRating();
      return;
    }

    // ⚠️ فلترة UX فقط — ليس أمان حقيقي
    this.isCheckingComment.set(true);
    this.commentWarning.set('');

    this.aiService.checkComment(comment).subscribe({
      next: (res) => {
        this.isCheckingComment.set(false);
        if (res.is_allowed) {
          // التعليق مقبول — أرسل
          this.doSubmitRating();
        } else {
          // ⚠️ فخ 10: قد يكون رفضاً حقيقياً أو عطل خدمة
          // لا تعرض "محتوى مخالف" دائماً
          this.commentWarning.set(
            res.message || 'يحتوي تعليقك على محتوى قد لا يتوافق مع سياستنا. يرجى مراجعته.'
          );
        }
      },
      error: () => {
        // فشل الاتصال — أرسل التعليق مباشرة (fail-open)
        this.isCheckingComment.set(false);
        this.doSubmitRating();
      }
    });
  }

  doSubmitRating(): void {
    if (this.ratingValue() === 0) return;
    const productId = this.ratingModalProductId();
    if (!productId) return;

    this.isSubmittingRating.set(true);
    this.ratingError.set(null);
    this.commentWarning.set('');

    const comment = this.ratingComment().trim();

    this.orderService.rateProduct(productId, this.ratingValue()).subscribe({
      next: () => {
        if (comment) {
          this.orderService.postComment(productId, comment).subscribe({
            next: () => {},
            error: () => {}
          });
        }
        this.isSubmittingRating.set(false);
        this.ratedProductIds.update(ids => new Set(ids).add(productId));
        this.closeRatingModal();
        this.successMessage.set('تم حفظ التقييم بنجاح');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => this.handleRatingError(err)
    });
  }

  private handleRatingError(err: any): void {
    this.isSubmittingRating.set(false);
    const status    = err?.status;
    const productId = this.ratingModalProductId();

    if (status === 422) {
      const msg = err?.error?.errors?.rating?.[0] ?? 'قيمة التقييم غير صالحة';
      this.ratingError.set(msg);
      return;
    }

    if (status === 403) {
      const code = err?.error?.error_code;
      if (code === 'OWN_PRODUCT_REVIEW_FORBIDDEN') {
        if (productId) {
          this.hiddenRatingProductIds.update(ids => new Set(ids).add(productId));
        }
        this.closeRatingModal();
        return;
      }
      if (code === 'PURCHASE_REQUIRED') {
        this.ratingError.set(err?.error?.error ?? 'يجب شراء المنتج واستلامه أولاً لتتمكن من تقييمه');
        return;
      }
      this.ratingError.set(err?.error?.error ?? 'غير مصرح بهذا الإجراء');
      return;
    }

    if (status === 404) {
      this.ratingError.set('المنتج غير موجود');
      return;
    }

    this.ratingError.set('حدث خطأ غير متوقع، حاول مرة أخرى');
  }
}

