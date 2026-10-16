import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  notifService = inject(NotificationService);
  private authService = inject(AuthService);
  public router = inject(Router);

  notifications    = this.notifService.notifications;
  unreadCount      = this.notifService.unreadCount;
  isLoading        = this.notifService.isLoading;
  showClearConfirm = signal(false);

  ngOnInit(): void { this.notifService.fetchAll(50); }

  markRead(id: string): void { this.notifService.markAsRead(id); }
  markAllRead(): void         { this.notifService.markAllRead(); }
  deleteOne(id: string): void { this.notifService.deleteOne(id); }
  dismiss(id: string): void   { this.notifService.deleteOne(id); }
  clearAll(): void {
    this.notifService.clearAll();
    this.showClearConfirm.set(false);
  }

  getNotifIcon(type: string): string {
    const map: Record<string, string> = {
      order_reminder:        'fas fa-box',
      order_auto_completed:  'fas fa-check-circle',
      order_cancelled:       'fas fa-times-circle',
      new_order:             'fas fa-shopping-bag',
      payment:               'fas fa-money-bill-wave',
      seller_status_changed: 'fas fa-store-slash',
      report_status_changed: 'fas fa-flag',
      new_follower:          'fas fa-user-plus',
    };
    return map[type] ?? 'fas fa-bell';
  }

  getNotifClass(type: string): string {
    const map: Record<string, string> = {
      order_reminder:        'order',
      order_auto_completed:  'approved',
      order_cancelled:       'rejected',
      new_order:             'order',
      payment:               'general',
      seller_status_changed: 'rejected',
      report_status_changed: 'report',
      new_follower:          'approved',
    };
    return map[type] ?? 'general';
  }

  onNotifClick(notif: any): void {
    // أولاً نحدد الإشعار كمقروء
    if (!notif.isRead && !notif.is_read) {
      this.markRead(notif.id);
      this.notifications.update(list =>
        list.map(n => n.id === notif.id
          ? { ...n, isRead: true, is_read: true } as any
          : n
        )
      );
    }

    // توجيه حسب نوع الإشعار
    const type = notif.type?.toLowerCase() ?? '';
    const data = notif.data ?? notif;

    // إشعار تغيير حالة التاجر / المتجر (إيقاف أو تنشيط المتجر)
    if (type.includes('seller') || type.includes('store_status') || type.includes('shop_status')) {
      this.router.navigate(['/merchant/dashboard']);
      return;
    }

    // طلب جديد أو تحديث طلب
    if (type.includes('order') || data.order_id || notif.orderId) {
      const orderId = data.order_id ?? notif.orderId;
      if (orderId) {
        this.router.navigate(['/orders', orderId]);
      } else {
        this.router.navigate(['/orders']);
      }
      return;
    }

    // تقييم جديد على منتج
    if (type.includes('review') || type.includes('rating') || data.product_id) {
      const productId = data.product_id ?? data.id;
      if (productId) {
        this.router.navigate(['/products', productId]);
      } else {
        this.router.navigate(['/products']);
      }
      return;
    }

    // بلاغ
    if (type.includes('report')) {
      if (this.authService.role() === 'admin') {
        this.router.navigate(['/admin/reports']);
      }
      return;
    }

    // طلب فتح متجر (للمدير)
    if (type.includes('application') || type.includes('merchant')) {
      if (this.authService.role() === 'admin') {
        this.router.navigate(['/admin/applications']);
      } else {
        this.router.navigate(['/merchant']);
      }
      return;
    }

    // طلب جاهز (للمشتري)
    if (type.includes('ready') || type.includes('delivery')) {
      this.router.navigate(['/orders']);
      return;
    }

    // إشعار عام — ما نوجّه
  }
}
