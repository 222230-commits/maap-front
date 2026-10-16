import { Component, ChangeDetectionStrategy, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';

interface MappedReport {
  id: string;
  targetType: 'product' | 'shop' | 'user' | string;
  targetId: string;
  targetName: string;
  reason: string;
  reporterName: string;
  createdAt: string;
  status: 'pending' | 'resolved' | 'dismissed' | string;
}

@Component({
  selector: 'app-admin-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private adminService = inject(AdminService);

  activeTab   = signal<'pending' | 'resolved' | 'dismissed'>('pending');
  filterType  = signal<'all' | 'product' | 'shop' | 'user'>('all');
  isLoading   = signal(true);
  error       = signal('');
  isActing    = signal(false);
  actionError = signal('');

  reports        = signal<MappedReport[]>([]);
  selectedReport = signal<MappedReport | null>(null);
  showDetailModal = signal(false);

  // Computed counts from loaded data (all statuses)
  totalReports     = computed(() => this.reports().length);
  pendingReports   = computed(() => this.reports().filter(r => r.status === 'pending').length);
  resolvedReports  = computed(() => this.reports().filter(r => r.status === 'resolved').length);
  dismissedReports = computed(() => this.reports().filter(r => r.status === 'dismissed').length);

  filteredReports = computed(() => {
    let list = this.reports();
    if (this.filterType() !== 'all') {
      list = list.filter(r => r.targetType === this.filterType());
    }
    return list;
  });

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.isLoading.set(true);
    this.error.set('');
    const type   = this.filterType() !== 'all' ? this.filterType() : undefined;
    const status = this.activeTab();
    this.adminService.getReports(type, status).subscribe({
      next: (res) => {
        const raw: any[] = res?.data?.data ?? res?.data ?? res ?? [];
        this.reports.set(raw.map(r => this.mapReport(r)));
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('فشل تحميل البلاغات');
        this.isLoading.set(false);
      }
    });
  }

  private mapReport(r: any): MappedReport {
    const targetId = String(
      r.target_id ?? r.targetId ?? r.product_id ?? r.shop_id ?? r.user_id ??
      r.product?.id ?? r.shop?.id ?? r.user?.id ?? ''
    );
    return {
      id:           r.id ?? '',
      // الحقول الفعلية قد تكون type أو target_type
      targetType:   r.target_type ?? r.targetType ?? r.type ?? 'user',
      targetId,
      targetName:   r.target_name ?? r.targetName ?? r.product?.title ?? r.shop?.business_name ?? r.user?.full_name ?? '—',
      reason:       r.reason ?? r.description ?? '',
      reporterName: r.reporter?.full_name ?? r.reporter_name ?? r.reporterName ?? '—',
      createdAt:    r.created_at ? new Date(r.created_at).toLocaleDateString('ar-LY') : (r.createdAt ?? ''),
      status:       r.status ?? 'pending',
    };
  }

  previewTarget(report: MappedReport): void {
    if (!report.targetId) return;
    let url = '';
    if (report.targetType === 'product') {
      url = `/products/${report.targetId}`;
    } else if (report.targetType === 'shop') {
      url = `/stores/${report.targetId}`;
    } else if (report.targetType === 'user') {
      url = `/buyers/${report.targetId}`;
    }
    if (url) {
      window.open(url, '_blank');
    }
  }

  changeTab(tab: 'pending' | 'resolved' | 'dismissed'): void {
    this.activeTab.set(tab);
    this.loadReports();
  }

  adminNotes       = signal('');
  actionSuccess    = signal('');
  showConfirmModal = signal(false);
  confirmTitle     = signal('');
  confirmMessage   = signal('');
  private pendingActionFn: (() => void) | null = null;

  changeType(type: 'all' | 'product' | 'shop' | 'user'): void {
    this.filterType.set(type);
    this.loadReports();
  }

  openDetail(report: MappedReport): void {
    this.selectedReport.set(report);
    this.showDetailModal.set(true);
    this.adminNotes.set('');
    this.actionError.set('');
    this.actionSuccess.set('');
    this.showConfirmModal.set(false);
  }

  closeDetail(): void {
    this.showDetailModal.set(false);
    this.selectedReport.set(null);
    this.adminNotes.set('');
    this.actionError.set('');
    this.actionSuccess.set('');
    this.showConfirmModal.set(false);
  }

  getActionLabel(targetType: string): string {
    switch (targetType) {
      case 'product': return 'حل البلاغ وإخفاء المنتج من المنصة';
      case 'shop':    return 'حل البلاغ وتجميد المتجر بالكامل';
      case 'user':    return 'حل البلاغ وحظر حساب المستخدم';
      case 'review':  return 'حل البلاغ وحذف التقييم المخالف';
      default:        return 'حل البلاغ واتخاذ الإجراء العقابي';
    }
  }

  confirmPunitiveAction(): void {
    const rep = this.selectedReport();
    if (!rep) return;

    let targetDesc = 'هذا العنصر';
    if (rep.targetType === 'product') targetDesc = `المنتج "${rep.targetName}" وإخفائه من المنصة`;
    else if (rep.targetType === 'shop') targetDesc = `المتجر "${rep.targetName}" وتجميد نشاطه`;
    else if (rep.targetType === 'user') targetDesc = `المستخدم "${rep.targetName}" وحظر حسابه من الدخول والتصفح`;
    else if (rep.targetType === 'review') targetDesc = `التقييم وحذفه`;

    this.confirmTitle.set('تأكيد اتخاذ الإجراء العقابي');
    this.confirmMessage.set(`هل أنت متأكد من معاقبة ${targetDesc}؟ سيتم تطبيق الإجراء فوراً وحل البلاغ.`);
    this.pendingActionFn = () => this.executeResolve(true);
    this.showConfirmModal.set(true);
  }

  confirmDismiss(): void {
    const rep = this.selectedReport();
    if (!rep) return;
    this.confirmTitle.set('تأكيد رفض البلاغ');
    this.confirmMessage.set('هل أنت متأكد من رفض هذا البلاغ واعتباره غير صحيح / كيدي؟');
    this.pendingActionFn = () => this.executeDismiss();
    this.showConfirmModal.set(true);
  }

  executeConfirmed(): void {
    if (this.pendingActionFn) {
      const fn = this.pendingActionFn;
      this.pendingActionFn = null;
      this.showConfirmModal.set(false);
      fn();
    }
  }

  cancelConfirm(): void {
    this.showConfirmModal.set(false);
    this.pendingActionFn = null;
  }

  resolveWithoutAction(): void {
    this.executeResolve(false);
  }

  private executeResolve(takeAction: boolean): void {
    const rep = this.selectedReport();
    if (!rep) return;
    this.isActing.set(true);
    this.actionError.set('');
    this.actionSuccess.set('');

    const notes = this.adminNotes().trim() || undefined;

    this.adminService.resolveReport(rep.id, {
      status: 'resolved',
      take_action: takeAction,
      admin_notes: notes
    }).subscribe({
      next: (res) => {
        this.isActing.set(false);
        const msg = res?.message || (takeAction ? 'تم اتخاذ الإجراء العقابي وحل البلاغ بنجاح' : 'تم توثيق حل البلاغ بنجاح');
        this.actionSuccess.set(msg);
        setTimeout(() => {
          this.closeDetail();
          this.loadReports();
        }, 1200);
      },
      error: (err) => {
        this.actionError.set(err?.error?.message ?? 'فشل تطبيق الإجراء على البلاغ');
        this.isActing.set(false);
      }
    });
  }

  private executeDismiss(): void {
    const rep = this.selectedReport();
    if (!rep) return;
    this.isActing.set(true);
    this.actionError.set('');
    this.actionSuccess.set('');

    const notes = this.adminNotes().trim() || undefined;

    this.adminService.resolveReport(rep.id, {
      status: 'dismissed',
      admin_notes: notes
    }).subscribe({
      next: (res) => {
        this.isActing.set(false);
        this.actionSuccess.set(res?.message || 'تم رفض البلاغ بنجاح');
        setTimeout(() => {
          this.closeDetail();
          this.loadReports();
        }, 1200);
      },
      error: (err) => {
        this.actionError.set(err?.error?.message ?? 'فشل رفض البلاغ');
        this.isActing.set(false);
      }
    });
  }
}
