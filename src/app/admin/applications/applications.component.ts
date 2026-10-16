import { Component, inject, OnInit, signal } from '@angular/core';
import { AdminService, Application } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-applications',  templateUrl: './applications.component.html',
  styleUrl: './applications.component.scss'
})
export class ApplicationsComponent implements OnInit {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);

  isLoading = signal(true);
  isActing = signal(false);
  error = signal('');
  activeTab = signal<'all'|'pending'|'approved'|'rejected'>('pending');
  applications = signal<Application[]>([]);
  selectedApp = signal<Application | null>(null);
  showDetailModal = signal(false);
  showRejectForm = signal(false);
  rejectionReason = signal('');
  adminNotes = signal('');
  actionSuccess = signal('');
  actionError = signal('');

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.adminService.getApplications(this.activeTab()).subscribe({
      next: (res) => {
        this.applications.set(res.data.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('فشل تحميل الطلبات');
        this.isLoading.set(false);
      }
    });
  }

  changeTab(tab: 'all'|'pending'|'approved'|'rejected'): void {
    this.activeTab.set(tab);
    this.loadApplications();
  }

  openDetail(app: Application): void {
    this.selectedApp.set(app);
    this.showDetailModal.set(true);
    this.showRejectForm.set(false);
    this.actionSuccess.set('');
    this.actionError.set('');
  }

  closeDetail(): void {
    this.showDetailModal.set(false);
    this.selectedApp.set(null);
  }

  approve(): void {
    if (!this.selectedApp()) return;
    this.isActing.set(true);
    this.adminService.approveApplication(this.selectedApp()!.id).subscribe({
      next: (res) => {
        this.actionSuccess.set('تمت الموافقة بنجاح!');
        this.isActing.set(false);
        this.authService.refreshUser();
        this.loadApplications();
        setTimeout(() => this.closeDetail(), 1500);
      },
      error: (err) => {
        this.actionError.set(err?.error?.message || 'فشلت عملية الموافقة');
        this.isActing.set(false);
      }
    });
  }

  reject(): void {
    if (!this.selectedApp() || !this.rejectionReason()) return;
    this.isActing.set(true);
    this.adminService.rejectApplication(
      this.selectedApp()!.id,
      this.rejectionReason(),
      this.adminNotes()
    ).subscribe({
      next: () => {
        this.actionSuccess.set('تم الرفض بنجاح');
        this.isActing.set(false);
        this.loadApplications();
        setTimeout(() => this.closeDetail(), 1500);
      },
      error: (err) => {
        this.actionError.set(err?.error?.message || 'فشلت عملية الرفض');
        this.isActing.set(false);
      }
    });
  }

  updateRejectionReason(v: string): void {
    this.rejectionReason.set(v);
  }

  updateAdminNotes(v: string): void {
    this.adminNotes.set(v);
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-LY');
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'معلق', approved: 'موافق', rejected: 'مرفوض'
    };
    return map[status] ?? status;
  }
}
