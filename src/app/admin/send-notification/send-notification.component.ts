import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-send-notification',  imports: [CommonModule],
  templateUrl: './send-notification.component.html',
  styleUrl: './send-notification.component.scss'
})
export class SendNotificationComponent {
  notificationType = signal<'season'|'update'|'general'>('general');
  targetCategory = signal<string>('all');
  title = signal('');
  message = signal('');
  sent = signal(false);
  sentCount = signal(0);

  categories = [
    { id: 'all', name: 'كل التجار' },
    { id: 'beauty', name: 'جمال وعناية' },
    { id: 'food', name: 'الأطعمة والمأكولات' },
    { id: 'handmade', name: 'الأشغال اليدوية' },
    { id: 'fashion', name: 'الأزياء والموضة' }
  ];

  notificationTypes = [
    { id: 'general', name: 'إشعار عام', icon: 'fas fa-bell', color: '#3b82f6' },
    { id: 'season', name: 'إشعار موسم', icon: 'fas fa-graduation-cap', color: '#522B5B' },
    { id: 'update', name: 'تحديث مهم', icon: 'fas fa-exclamation-circle', color: '#f59e0b' }
  ];

  updateTitle(v: string) {
    this.title.set(v);
  }

  updateMessage(v: string) {
    this.message.set(v);
  }

  sendNotification() {
    const count = this.targetCategory() === 'all' ? 23 : 6;
    this.sentCount.set(count);
    this.sent.set(true);
    setTimeout(() => {
      this.sent.set(false);
      this.title.set('');
      this.message.set('');
    }, 4000);
  }
}
