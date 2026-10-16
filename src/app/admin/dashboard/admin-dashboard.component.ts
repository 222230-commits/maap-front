import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, Application } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  public router = inject(Router);
  public authService = inject(AuthService);

  sidebarCollapsed = signal(false);

  isLoading = signal(true);
  error = signal('');

  stats = signal({
    buyers_count: 0,
    sellers_count: 0,
    products_count: 0,
    orders_count: 0,
    pending_applications_count: 0,
    new_reports_count: 0
  });

  recentApplications = signal<Application[]>([]);
  recentActivities = signal<any[]>([]);
  footerCounters = signal<any>(null);
  applicationsChart = signal<any>(null);
  
  animatedStats = signal({
    buyers: 0, sellers: 0,
    products: 0, orders: 0
  });

  ngOnInit(): void {
    this.adminService.getDashboard().subscribe({
      next: (res) => {
        const cards = res.data.top_cards;
        this.stats.set(cards);
        
        this.recentActivities.set(res.data.recent_activities ?? []);
        this.footerCounters.set(res.data.footer_counters ?? null);
        this.applicationsChart.set(res.data.seller_applications_chart ?? null);
        this.recentApplications.set(res.data.pending_applications_list?.slice(0, 3) ?? []);

        this.isLoading.set(false);
        this.animateNumbers(cards);
      },
      error: (err) => {
        this.error.set('فشل تحميل البيانات');
        this.isLoading.set(false);
      }
    });
    
    this.adminService.getApplications('pending').subscribe({
      next: (res) => {
        this.recentApplications.set(res.data.data.slice(0, 3));
      }
    });
  }

  animateNumbers(cards: any): void {
    const keys = ['buyers', 'sellers', 'products', 'orders'];
    const targets = [
      cards.buyers_count,
      cards.sellers_count,
      cards.products_count,
      cards.orders_count
    ];
    
    keys.forEach((key, i) => {
      let current = 0;
      const target = targets[i];
      const step = Math.ceil(target / 30) || 1;
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        this.animatedStats.update(s => ({...s, [key]: current}));
        if (current >= target) clearInterval(interval);
      }, 50);
    });
  }

  goTo(path: string): void {
    this.router.navigate([path]);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('ar-LY');
  }
}
