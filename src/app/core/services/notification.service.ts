import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  orderId?: string;
  isRead: boolean;
  createdAt: string;
  icon: string;
}

const TYPE_ICON: Record<string, string> = {
  order_reminder:        'fas fa-box',
  order_auto_completed:  'fas fa-check-circle',
  order_cancelled:       'fas fa-times-circle',
  new_order:             'fas fa-shopping-bag',
  payment:               'fas fa-money-bill-wave',
  seller_status_changed: 'fas fa-store-slash',
  report_status_changed: 'fas fa-flag',
  new_follower:          'fas fa-user-plus',
};

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl;

  notifications = signal<AppNotification[]>([]);
  unreadCount   = signal(0);
  isLoading     = signal(false);

  private timer: ReturnType<typeof setInterval> | null = null;

  // ─── Polling ──────────────────────────────────────────────
  startPolling(): void {
    this.fetchAll();
    this.fetchUnreadCount();
    if (!this.timer) {
      this.timer = setInterval(() => this.fetchUnreadCount(), 30_000);
    }
  }

  stopPolling(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  ngOnDestroy(): void { this.stopPolling(); }

  // ─── GET /notifications ───────────────────────────────────
  fetchAll(perPage = 20): void {
    this.isLoading.set(true);
    this.http.get<any>(`${this.BASE}/notifications?per_page=${perPage}`).subscribe({
      next: (res) => {
        const raw: any[] = res?.data ?? [];
        this.notifications.set(raw.map(n => this.map(n)));
        this.unreadCount.set(raw.filter(n => n.read_at === null).length);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // ─── GET /notifications/unread-count ─────────────────────
  fetchUnreadCount(): void {
    this.http.get<any>(`${this.BASE}/notifications/unread-count`).subscribe({
      next: (res) => this.unreadCount.set(res?.unread_count ?? 0),
      error: () => {}   // silent fail — badge سيبقى على القيمة القديمة
    });
  }

  // ─── PATCH /notifications/{id}/read ──────────────────────
  markAsRead(id: string): void {
    // Optimistic update
    this.notifications.update(ns =>
      ns.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    this.unreadCount.update(c => Math.max(0, c - 1));
    this.http.patch<any>(`${this.BASE}/notifications/${id}/read`, {}).subscribe({
      error: () => {
        // revert on error
        this.notifications.update(ns =>
          ns.map(n => n.id === id ? { ...n, isRead: false } : n)
        );
        this.unreadCount.update(c => c + 1);
      }
    });
  }

  // ─── POST /notifications/mark-all-read ───────────────────
  markAllRead(): void {
    this.notifications.update(ns => ns.map(n => ({ ...n, isRead: true })));
    this.unreadCount.set(0);
    this.http.post<any>(`${this.BASE}/notifications/mark-all-read`, {}).subscribe({
      error: () => this.fetchAll()   // revert by re-fetching
    });
  }

  // ─── DELETE /notifications/{id}/delete ───────────────────
  deleteOne(id: string): void {
    const removed = this.notifications().find(n => n.id === id);
    this.notifications.update(ns => ns.filter(n => n.id !== id));
    if (removed && !removed.isRead) {
      this.unreadCount.update(c => Math.max(0, c - 1));
    }
    this.http.delete<any>(`${this.BASE}/notifications/${id}/delete`).subscribe({
      error: () => this.fetchAll()
    });
  }

  // ─── DELETE /notifications/clear-all ─────────────────────
  clearAll(): void {
    this.http.delete<any>(`${this.BASE}/notifications/clear-all`).subscribe({
      next: () => { this.notifications.set([]); this.unreadCount.set(0); },
      error: () => {}
    });
  }

  // ─── Helper ───────────────────────────────────────────────
  private map(n: any): AppNotification {
    return {
      id:        n.id ?? '',
      title:     n.data?.title ?? n.title ?? 'إشعار',
      body:      n.data?.body  ?? n.body  ?? '',
      type:      n.type ?? '',
      orderId:   n.order_id ?? undefined,
      isRead:    n.read_at !== null && n.read_at !== undefined,
      createdAt: n.created_at
                   ? new Date(n.created_at).toLocaleDateString('ar-LY')
                   : '',
      icon: TYPE_ICON[n.type] ?? 'fas fa-bell',
    };
  }

  // ─── Admin Notifications ───────────────────────────────────

  // GET /admin/notifications
  getAdminNotifications(perPage = 20) {
    return this.http.get<any>(`${this.BASE}/admin/notifications?per_page=${perPage}`);
  }

  // GET /admin/notifications/unread-count
  getAdminUnreadCount() {
    return this.http.get<{ success: boolean; unread_count: number }>(
      `${this.BASE}/admin/notifications/unread-count`
    );
  }

  // PATCH /admin/notifications/{id}/read
  adminMarkAsRead(id: string) {
    return this.http.patch<any>(`${this.BASE}/admin/notifications/${id}/read`, {});
  }

  // POST /admin/notifications/mark-all-read
  adminMarkAllRead() {
    return this.http.post<any>(`${this.BASE}/admin/notifications/mark-all-read`, {});
  }

  // DELETE /admin/notifications/{id}/delete
  adminDeleteOne(id: string) {
    return this.http.delete<any>(`${this.BASE}/admin/notifications/${id}/delete`);
  }

  // DELETE /admin/notifications/clear-all
  adminClearAll() {
    return this.http.delete<any>(`${this.BASE}/admin/notifications/clear-all`);
  }
}

