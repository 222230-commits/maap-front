import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BuyerService } from '@core/services/buyer.service';

@Component({
  selector: 'app-buyer-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './buyer-profile.component.html',
  styleUrl: './buyer-profile.component.scss'
})
export class BuyerProfileComponent implements OnInit {
  private buyerService = inject(BuyerService);
  private route        = inject(ActivatedRoute);
  public  router       = inject(Router);

  isLoading     = signal(true);
  error         = signal('');
  profile       = signal<any>(null);

  // ── المتاجر المتابَعة ──
  shops             = signal<any[]>([]);
  shopsCurrentPage  = signal(1);
  shopsLastPage     = signal(1);
  isLoadingShops    = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('buyerId') ?? '';
    this.loadProfile(id);
    this.loadFollowedShops(id, 1);
  }

  private getBuyerId(): string {
    return this.route.snapshot.paramMap.get('buyerId') ?? '';
  }

  loadProfile(id: string): void {
    this.isLoading.set(true);
    this.buyerService.getPublicBuyerProfile(id).subscribe({
      next: (res) => {
        this.profile.set(res.data ?? res);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(
          err?.status === 403
            ? 'هذا البروفايل غير متاح'
            : 'المستخدم غير موجود'
        );
        this.isLoading.set(false);
      }
    });
  }

  loadFollowedShops(id: string, page: number): void {
    this.isLoadingShops.set(true);
    this.buyerService.getBuyerFollowedShops(id, page).subscribe({
      next: (res) => {
        // ⚠ تعشيش مزدوج موثق: العناصر في res.data.data وليس res.data مباشرة
        this.shops.set(res.data?.data ?? []);
        this.shopsCurrentPage.set(res.data?.current_page ?? 1);
        this.shopsLastPage.set(res.data?.last_page ?? 1);
        this.isLoadingShops.set(false);
      },
      error: () => this.isLoadingShops.set(false)
    });
  }

  goToShopsPage(page: number): void {
    if (page < 1 || page > this.shopsLastPage()) return;
    this.loadFollowedShops(this.getBuyerId(), page);
  }

  getInitial(): string {
    return (this.profile()?.personal_info?.full_name ?? '?').charAt(0);
  }
}
