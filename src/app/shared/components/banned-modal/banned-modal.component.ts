import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

export interface BanAppeal {
  reference: string;
  userId: string;
  userName: string;
  userEmail: string;
  reasonType: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'reviewed';
}

@Component({
  selector: 'app-banned-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './banned-modal.component.html',
  styleUrl: './banned-modal.component.scss'
})
export class BannedModalComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);

  // ── الحالة (State) ──
  activeTab = signal<'restrictions' | 'appeal' | 'appeal_success'>('restrictions');
  shake = signal(false);
  showBackdropWarning = signal(false);
  private warningTimer: any = null;

  // ── نموذج الالتماس (Appeal Form) ──
  appealReasonType = signal('mistake');
  appealMessage = signal('');
  isSubmitting = signal(false);
  errorMessage = signal('');
  submittedAppeal = signal<BanAppeal | null>(null);

  // ── خيارات أسباب الالتماس ──
  appealReasons = [
    { value: 'mistake', label: 'حظر تم عن طريق الخطأ دون أي مخالفة' },
    { value: 'misunderstanding', label: 'سوء فهم مع عميل أو تاجر وتمت تسويته' },
    { value: 'resolved', label: 'تم تصحيح وحذف أي محتوى أو منتج مخالف' },
    { value: 'pledge', label: 'تعهد والتزام كامل بسياسات وشروط المنصة مستقبلاً' },
    { value: 'other', label: 'سبب آخر يرجى مراجعته' }
  ];

  currentUser = computed(() => this.authService.currentUser());

  userRoleDisplay = computed(() => {
    const r = this.currentUser()?.role;
    if (r === 'seller') return 'تاجر';
    if (r === 'admin') return 'مشرف / مسؤول';
    return 'مشتري';
  });

  banReason = computed(() => {
    return this.authService.banReason() ||
      (this.currentUser() as any)?.ban_reason ||
      'تم إيقاف حسابك من قِبل إدارة المنصة لانتهاك معايير وشروط الاستخدام أو بناءً على بلاغ تم التحقق منه.';
  });

  ngOnInit(): void {
    const user = this.currentUser();
    if (user?.id) {
      try {
        const saved = localStorage.getItem(`banned_appeal_${user.id}`);
        if (saved) {
          this.submittedAppeal.set(JSON.parse(saved));
        }
      } catch {
        // ignore
      }
    }
  }

  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('banned-lockout-backdrop')) {
      this.triggerShake();
    }
  }

  triggerShake(): void {
    this.shake.set(true);
    this.showBackdropWarning.set(true);

    if (this.warningTimer) clearTimeout(this.warningTimer);
    setTimeout(() => this.shake.set(false), 500);
    this.warningTimer = setTimeout(() => this.showBackdropWarning.set(false), 3000);
  }

  setTab(tab: 'restrictions' | 'appeal' | 'appeal_success'): void {
    this.errorMessage.set('');
    this.activeTab.set(tab);
  }

  submitAppeal(): void {
    const text = this.appealMessage().trim();
    if (!text) {
      this.errorMessage.set('يرجى كتابة نص وتوضيح الالتماس قبل الإرسال.');
      return;
    }
    if (text.length < 15) {
      this.errorMessage.set('يرجى تقديم شرح أوضح لطلب الالتماس (15 حرفاً على الأقل).');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const user = this.currentUser();
    const refNum = 'APL-' + Math.floor(100000 + Math.random() * 900000);

    const appeal: BanAppeal = {
      reference: refNum,
      userId: user?.id || 'unknown',
      userName: user?.full_name || 'مستخدم',
      userEmail: user?.email || '',
      reasonType: this.appealReasonType(),
      message: text,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    setTimeout(() => {
      try {
        if (user?.id) {
          localStorage.setItem(`banned_appeal_${user.id}`, JSON.stringify(appeal));
        }
      } catch {
        // ignore
      }

      this.submittedAppeal.set(appeal);
      this.isSubmitting.set(false);
      this.activeTab.set('appeal_success');
    }, 800);
  }

  getWhatsAppLink(appeal?: BanAppeal | null): string {
    const app = appeal || this.submittedAppeal();
    const user = this.currentUser();
    const name = user?.full_name || 'مستخدم';
    const email = user?.email || '';
    const ref = app ? app.reference : 'جديد';
    const reasonText = app ? app.message : this.appealMessage() || 'أرجو مراجعة حظر حسابي';

    const msg = `مرحباً إدارة المنصة،
أود تقديم طلب التماس (Appeal) لفك الحظر عن حسابي.
الاسم: ${name}
البريد: ${email}
رقم مرجع الالتماس: #${ref}
توضيح الموقف:
${reasonText}`;

    return `https://wa.me/218900000000?text=${encodeURIComponent(msg)}`;
  }

  getEmailLink(appeal?: BanAppeal | null): string {
    const app = appeal || this.submittedAppeal();
    const user = this.currentUser();
    const name = user?.full_name || 'مستخدم';
    const email = user?.email || '';
    const ref = app ? app.reference : 'جديد';
    const reasonText = app ? app.message : this.appealMessage() || 'أرجو مراجعة حظر حسابي';

    const subject = `طلب التماس لفك الحظر (Appeal) - #${ref} - ${name}`;
    const body = `السادة إدارة المنصة المحترمين،

أتقدم بطلب التماس لفك الحظر عن حسابي:
الاسم: ${name}
البريد الإلكتروني: ${email}
رقم الالتماس: #${ref}

نص وتوضيح الالتماس:
${reasonText}

شاكراً لكم حسن تعاونكم.`;

    return `mailto:support@maab.ly?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  relogin(): void {
    const email = this.currentUser()?.email;
    this.authService.logout();
    this.router.navigate(['/auth/login'], { queryParams: email ? { email } : {} });
  }

  logout(): void {
    this.authService.logout();
  }
}
