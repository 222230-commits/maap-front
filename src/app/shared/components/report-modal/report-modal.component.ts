import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-report-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="report-backdrop" (click)="close()"></div>
      <div class="report-modal">

        <div class="report-header">
          <div class="report-icon">
            <i class="fas fa-flag"></i>
          </div>
          <div>
            <h3>تبليغ عن {{ targetType() === 'store' ? 'متجر' : 'منتج' }}</h3>
            <p>{{ targetName() }}</p>
          </div>
          <button class="report-close" (click)="close()" type="button">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="report-body">

          @if (successMsg()) {
            <div class="report-success">
              <i class="fas fa-check-circle"></i>
              تم إرسال البلاغ بنجاح. سنراجعه في أقرب وقت.
            </div>
          } @else {

            <p class="report-desc">
              اختر سبب البلاغ وسنتخذ الإجراء المناسب
            </p>

            <div class="report-reasons">
              @for (reason of reasons; track reason.value) {
                <label class="reason-option"
                       [class.selected]="selectedReason() === reason.value">
                  <input type="radio"
                         [value]="reason.value"
                         (change)="selectedReason.set(reason.value)"
                         hidden />
                  <div class="reason-radio">
                    @if (selectedReason() === reason.value) {
                      <i class="fas fa-check"></i>
                    }
                  </div>
                  <div class="reason-text">
                    <span class="reason-title">{{ reason.label }}</span>
                    <span class="reason-desc">{{ reason.desc }}</span>
                  </div>
                </label>
              }
            </div>

            <div class="report-note-section">
              <label>تفاصيل إضافية (اختياري)</label>
              <textarea rows="3"
                        placeholder="أضف أي تفاصيل تساعدنا في المراجعة..."
                        [value]="note()"
                        (input)="note.set($any($event.target).value)">
              </textarea>
            </div>

            @if (errorMsg()) {
              <div class="report-error">
                <i class="fas fa-exclamation-circle"></i>
                {{ errorMsg() }}
              </div>
            }

            <button class="btn-send-report"
                    type="button"
                    (click)="submit()"
                    [disabled]="isSending() || !selectedReason()">
              @if (isSending()) {
                <i class="fas fa-spinner fa-spin"></i>
                جاري الإرسال...
              } @else {
                <i class="fas fa-paper-plane"></i>
                إرسال البلاغ
              }
            </button>

          }

        </div>
      </div>
    }
  `,
  styles: [`
    .report-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5); z-index: 200;
      backdrop-filter: blur(4px);
    }

    .report-modal {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: white; border-radius: 20px;
      width: 90%; max-width: 480px; z-index: 201;
      direction: rtl; max-height: 85vh; overflow-y: auto;
      box-shadow: 0 24px 60px rgba(0,0,0,0.2);
    }

    .report-header {
      display: flex; align-items: center; gap: 14px;
      padding: 18px 20px;
      background: linear-gradient(135deg, #1A0030, #3A004D);
      color: white; border-radius: 20px 20px 0 0;
    }

    .report-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: rgba(255,255,255,0.15);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }

    .report-header h3 {
      font-family: 'Tajawal', sans-serif;
      font-size: 0.95rem; font-weight: 700; margin: 0 0 3px;
    }

    .report-header p {
      font-family: 'Tajawal', sans-serif;
      font-size: 0.78rem; opacity: 0.7; margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-width: 200px;
    }

    .report-close {
      margin-right: auto; background: rgba(255,255,255,0.1);
      border: none; color: white; width: 30px; height: 30px;
      border-radius: 8px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; transition: background 0.2s; flex-shrink: 0;
    }

    .report-close:hover { background: rgba(255,255,255,0.25); }

    .report-body { padding: 20px; }

    .report-desc {
      font-family: 'Tajawal', sans-serif;
      font-size: 0.875rem; color: #6B7280; margin: 0 0 16px;
    }

    .report-reasons {
      display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;
    }

    .reason-option {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 12px;
      border: 1.5px solid #E5E7EB; cursor: pointer;
      transition: all 0.2s; background: white;
    }

    .reason-option.selected {
      border-color: #3A004D; background: #F5EEFF;
    }

    .reason-radio {
      width: 20px; height: 20px; border-radius: 50%;
      border: 2px solid #D1D5DB; display: flex;
      align-items: center; justify-content: center;
      flex-shrink: 0; transition: all 0.2s;
      font-size: 10px;
    }

    .reason-option.selected .reason-radio {
      background: #3A004D; border-color: #3A004D; color: white;
    }

    .reason-text { display: flex; flex-direction: column; gap: 2px; }

    .reason-title {
      font-family: 'Tajawal', sans-serif;
      font-size: 0.875rem; font-weight: 700; color: #1A0A2E;
    }

    .reason-desc {
      font-family: 'Tajawal', sans-serif;
      font-size: 0.75rem; color: #9CA3AF;
    }

    .report-note-section { margin-bottom: 14px; }

    .report-note-section label {
      display: block; font-family: 'Tajawal', sans-serif;
      font-size: 0.8rem; font-weight: 700; color: #374151;
      margin-bottom: 6px;
    }

    .report-note-section textarea {
      width: 100%; padding: 10px 12px;
      border: 1.5px solid #E5E7EB; border-radius: 10px;
      font-family: 'Tajawal', sans-serif; font-size: 0.875rem;
      color: #1A0A2E; outline: none; resize: vertical;
      direction: rtl; background: white; box-sizing: border-box;
      transition: border-color 0.2s;
    }

    .report-note-section textarea:focus {
      border-color: #3A004D;
      box-shadow: 0 0 0 3px #E8D5F5;
    }

    .report-error {
      background: #FEF2F2; color: #DC2626;
      border: 1px solid #FECACA; border-radius: 10px;
      padding: 10px 14px; margin-bottom: 12px;
      font-family: 'Tajawal', sans-serif; font-size: 0.82rem;
      display: flex; align-items: center; gap: 8px;
    }

    .report-success {
      background: #F0FDF4; color: #16A34A;
      border: 1px solid #BBF7D0; border-radius: 12px;
      padding: 16px; font-family: 'Tajawal', sans-serif;
      font-size: 0.9rem; font-weight: 600;
      display: flex; align-items: center; gap: 10px;
    }

    .btn-send-report {
      width: 100%; background: #3A004D; color: white; border: none;
      padding: 13px; border-radius: 12px; cursor: pointer;
      font-family: 'Tajawal', sans-serif;
      font-size: 0.95rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      gap: 8px; transition: all 0.2s;
    }

    .btn-send-report:hover:not(:disabled) { background: #6B2D8B; }
    .btn-send-report:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class ReportModalComponent {
  isOpen = signal(false);
  targetType = signal<'store' | 'product'>('store');
  targetId = signal<string>('');
  targetName = signal<string>('');
  selectedReason = signal<string>('');
  note = signal<string>('');
  isSending = signal(false);
  successMsg = signal(false);
  errorMsg = signal<string>('');

  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl || 'https://mycelia-2g71.onrender.com/api';

  reasons = [
    {
      value: 'fake_product',
      label: 'منتج مزيف أو غير حقيقي',
      desc: 'الصور أو الوصف لا يطابق المنتج الفعلي'
    },
    {
      value: 'inappropriate_content',
      label: 'محتوى غير لائق',
      desc: 'صور أو نصوص مسيئة أو غير مناسبة'
    },
    {
      value: 'scam',
      label: 'احتيال أو نصب',
      desc: 'تاجر لا يرد أو لم يسلم الطلب'
    },
    {
      value: 'wrong_price',
      label: 'سعر مضلل',
      desc: 'السعر المعروض لا يطابق السعر الفعلي'
    },
    {
      value: 'other',
      label: 'سبب آخر',
      desc: 'اذكر التفاصيل في الحقل أدناه'
    }
  ];

  open(type: 'store' | 'product', id: string, name: string): void {
    this.targetType.set(type);
    this.targetId.set(id);
    this.targetName.set(name);
    this.selectedReason.set('');
    this.note.set('');
    this.successMsg.set(false);
    this.errorMsg.set('');
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  submit(): void {
    if (!this.selectedReason()) {
      this.errorMsg.set('يرجى اختيار سبب البلاغ');
      return;
    }

    this.isSending.set(true);
    this.errorMsg.set('');

    const body = {
      reportable_type: this.targetType() === 'store' ? 'store' : 'product',
      reportable_id: this.targetId(),
      reason: this.selectedReason(),
      notes: this.note() || null
    };

    this.http.post<any>(
      `${this.BASE}/reports`, body
    ).subscribe({
      next: () => {
        this.isSending.set(false);
        this.successMsg.set(true);
        setTimeout(() => this.close(), 2500);
      },
      error: (err: any) => {
        this.isSending.set(false);
        this.errorMsg.set(
          err?.error?.message || 'فشل الإرسال، حاول مرة أخرى'
        );
      }
    });
  }
}
