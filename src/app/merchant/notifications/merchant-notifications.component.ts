import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-merchant-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './merchant-notifications.component.html',
  styleUrl: './merchant-notifications.component.scss'
})
export class MerchantNotificationsComponent implements OnInit {
  notifService = inject(NotificationService);

  notifications  = this.notifService.notifications;
  unreadCount    = this.notifService.unreadCount;
  isLoading      = this.notifService.isLoading;

  showClearConfirm = signal(false);

  ngOnInit(): void {
    this.notifService.fetchAll(50);
  }

  markRead(id: string): void    { this.notifService.markAsRead(id); }
  markAllRead(): void            { this.notifService.markAllRead(); }
  deleteOne(id: string): void    { this.notifService.deleteOne(id); }
  clearAll(): void {
    this.notifService.clearAll();
    this.showClearConfirm.set(false);
  }
}
