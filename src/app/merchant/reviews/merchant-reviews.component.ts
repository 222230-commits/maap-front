import {
  ChangeDetectionStrategy, Component, inject, OnInit, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MerchantService } from '@core/services/merchant.service';

@Component({
  selector: 'app-merchant-reviews',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './merchant-reviews.component.html',
  styleUrl: './merchant-reviews.component.scss'
})
export class MerchantReviewsComponent implements OnInit {
  private merchantService = inject(MerchantService);

  isLoading    = signal(true);
  error        = signal('');
  reviews      = signal<any[]>([]);
  currentPage  = signal(1);
  lastPage     = signal(1);
  filterRating = signal(0); // 0 = all

  filteredReviews = computed(() => {
    const r = this.filterRating();
    if (r === 0) return this.reviews();
    return this.reviews().filter(rv => (rv.rating ?? 0) === r);
  });

  averageRating = computed(() => {
    const list = this.reviews();
    if (!list.length) return 0;
    return +(list.reduce((s, r) => s + (r.rating ?? 0), 0) / list.length).toFixed(1);
  });

  ngOnInit(): void {
    this.loadReviews(1);
  }

  loadReviews(page: number): void {
    this.isLoading.set(true);
    this.error.set('');
    this.merchantService.getReviews(page).subscribe({
      next: (res) => {
        const raw = res?.data?.data ?? res?.data ?? [];
        this.reviews.set(Array.isArray(raw) ? raw : []);
        this.currentPage.set(res?.data?.current_page ?? res?.meta?.current_page ?? 1);
        this.lastPage.set(res?.data?.last_page ?? res?.meta?.last_page ?? 1);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('فشل تحميل التقييمات');
        this.isLoading.set(false);
      }
    });
  }

  setFilterRating(value: number): void { this.filterRating.set(value); }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage()) return;
    this.loadReviews(page);
  }

  getStars(): number[] { return [1, 2, 3, 4, 5]; }

  getRatingCount(star: number): number {
    return this.reviews().filter(r => r.rating === star).length;
  }
}
