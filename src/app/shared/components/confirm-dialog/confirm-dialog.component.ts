import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="confirm-backdrop" (click)="onCancel()" aria-hidden="true"></div>
      <div class="confirm-modal-wrapper" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <div class="confirm-modal" [class.danger-theme]="isDanger()">
          
          <div class="confirm-icon-box" [class.danger]="isDanger()">
            <i [class]="icon()"></i>
          </div>

          <div class="confirm-body">
            <h3 class="confirm-title">{{ title() }}</h3>
            <p class="confirm-message">{{ message() }}</p>
          </div>

          <div class="confirm-actions">
            <button type="button" 
                    class="btn-confirm" 
                    [class.danger]="isDanger()"
                    [disabled]="isLoading()"
                    (click)="onConfirm()">
              @if (isLoading()) {
                <i class="fas fa-spinner fa-spin"></i>
              }
              <span>{{ confirmText() }}</span>
            </button>

            <button type="button" 
                    class="btn-cancel" 
                    [disabled]="isLoading()"
                    (click)="onCancel()">
              {{ cancelText() }}
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .confirm-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 7, 25, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    .confirm-modal-wrapper {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      z-index: 1001;
      direction: rtl;
    }

    .confirm-modal {
      width: 100%;
      max-width: 420px;
      background: white;
      border-radius: 20px;
      padding: 28px 24px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(58, 0, 77, 0.25);
      border: 1px solid rgba(0, 0, 0, 0.06);
      animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .confirm-icon-box {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      background: #EDE9FE;
      color: #6D28D9;

      &.danger {
        background: #FEE2E2;
        color: #DC2626;
      }
    }

    .confirm-title {
      font-family: 'Tajawal', sans-serif;
      font-size: 1.25rem;
      font-weight: 800;
      color: #1F2937;
      margin: 0 0 8px;
    }

    .confirm-message {
      font-family: 'Tajawal', sans-serif;
      font-size: 0.95rem;
      color: #4B5563;
      margin: 0 0 24px;
      line-height: 1.6;
    }

    .confirm-actions {
      display: flex;
      gap: 10px;
      flex-direction: row-reverse;
    }

    .btn-confirm {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 18px;
      border-radius: 12px;
      font-family: 'Tajawal', sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      background: var(--primary, #522B5B);
      color: white;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        opacity: 0.92;
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &.danger {
        background: #DC2626;

        &:hover:not(:disabled) {
          background: #B91C1C;
        }
      }
    }

    .btn-cancel {
      flex: 1;
      padding: 12px 18px;
      border-radius: 12px;
      font-family: 'Tajawal', sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid #E5E7EB;
      background: #F9FAFB;
      color: #4B5563;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: #F3F4F6;
        border-color: #D1D5DB;
        color: #111827;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes popIn {
      from { opacity: 0; transform: scale(0.92) translateY(10px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
  `]
})
export class ConfirmDialogComponent {
  isOpen      = input<boolean>(false);
  title       = input<string>('تأكيد العملية');
  message     = input<string>('هل أنت متأكد من المتابعة؟');
  confirmText = input<string>('تأكيد');
  cancelText  = input<string>('إلغاء');
  isDanger    = input<boolean>(true);
  isLoading   = input<boolean>(false);
  icon        = input<string>('fas fa-exclamation-triangle');

  confirmed = output<void>();
  cancelled = output<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
