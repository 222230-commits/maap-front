import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-shops',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './shops.component.html',
  styleUrl: './shops.component.scss'
})
export class ShopsComponent implements OnInit {
  private adminService = inject(AdminService);

  shops           = signal<any[]>([]);
  isLoading       = signal(true);
  error           = signal('');
  statusFilter    = signal('');
  searchQuery     = signal('');
  isTogglingId    = signal<string | null>(null);
  isDeletingId    = signal<string | null>(null);
  showDeleteConfirm = signal<string | null>(null);
  selectedShop    = signal<any | null>(null);
  showDetail      = signal(false);
  showAnalytics   = signal(false);
  analytics       = signal<any | null>(null);
  isLoadingDetails = signal(false);

  // ── Pagination State ──
  currentPage = signal(1);
  lastPage    = signal(1);
  totalShops  = signal(0);
  perPage     = signal(100);

  pages = computed<number[]>(() => {
    const total = this.lastPage();
    const current = this.currentPage();
    if (total <= 1) return [];

    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    const list: number[] = [];
    for (let i = start; i <= end; i++) {
      list.push(i);
    }
    return list;
  });

  filteredShops = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.shops();
    return this.shops().filter(s =>
      (s.business_name ?? s.name ?? '').toLowerCase().includes(q) ||
      (s.seller?.full_name ?? '').toLowerCase().includes(q)
    );
  });

  ngOnInit(): void { this.loadShops(); }

  loadShops(page: number = this.currentPage()): void {
    this.isLoading.set(true);
    this.error.set('');
    this.currentPage.set(page);
    const status = this.statusFilter() || undefined;
    this.adminService.getShops(status, undefined, this.perPage(), page).subscribe({
      next: (res) => {
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        const total = res?.data?.total ?? res?.total ?? (Array.isArray(raw) ? raw.length : 0);
        const lastPg = res?.data?.last_page ?? res?.last_page ?? 1;
        this.shops.set(Array.isArray(raw) ? raw : []);
        this.totalShops.set(total);
        this.lastPage.set(lastPg);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('فشل تحميل المتاجر');
        this.isLoading.set(false);
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage() || page === this.currentPage()) return;
    this.loadShops(page);
  }

  openDetail(shop: any): void {
    this.selectedShop.set(shop);
    this.showDetail.set(true);
    this.showAnalytics.set(false);
    this.analytics.set(null);
  }

  loadAnalytics(shopId: string): void {
    this.isLoadingDetails.set(true);
    this.adminService.getShopAnalytics(shopId).subscribe({
      next: (res) => {
        this.analytics.set(res?.analytics ?? res?.data ?? res ?? null);
        this.showAnalytics.set(true);
        this.isLoadingDetails.set(false);
      },
      error: () => this.isLoadingDetails.set(false)
    });
  }

  closeDetail(): void {
    this.showDetail.set(false);
    this.selectedShop.set(null);
    this.analytics.set(null);
    this.showAnalytics.set(false);
  }

  toggleStatus(shop: any): void {
    if (this.isTogglingId()) return;
    this.isTogglingId.set(shop.id);
    this.adminService.toggleShopStatus(shop.id).subscribe({
      next: () => { this.isTogglingId.set(null); this.loadShops(); },
      error: () => this.isTogglingId.set(null)
    });
  }

  confirmDelete(id: string): void { this.showDeleteConfirm.set(id); }
  cancelDelete(): void { this.showDeleteConfirm.set(null); }

  deleteShop(id: string): void {
    this.isDeletingId.set(id);
    this.adminService.deleteShop(id).subscribe({
      next: () => {
        this.isDeletingId.set(null);
        this.showDeleteConfirm.set(null);
        this.closeDetail();
        this.loadShops();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'فشل حذف المتجر');
        this.isDeletingId.set(null);
      }
    });
  }

  updateSearch(v: string): void { this.searchQuery.set(v); }
  changeStatus(v: string): void { this.statusFilter.set(v); this.loadShops(); }
  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('ar-LY') : '—'; }
}
