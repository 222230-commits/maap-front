import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-interests',
  templateUrl: './interests.component.html',
  styleUrl: './interests.component.scss'
})
export class InterestsComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  userId = signal(localStorage.getItem('pending_user_id') ?? '');
  isLoading = signal(false);
  errorMessage = signal('');

  availableCategories = signal([
    { id: '05f82e28-2a66-4285-b08a-ba698a35860e',
      name: 'جمال وعناية', image_url: null },
    { id: '89b5c79f-ef71-4620-ad81-8ba48386d552',
      name: 'الأطعمة والمأكولات', image_url: null },
    { id: 'c3d4e5f6-0000-0000-0000-000000000003',
      name: 'الأشغال اليدوية', image_url: null },
    { id: 'c3d4e5f6-0000-0000-0000-000000000004',
      name: 'الأزياء والموضة', image_url: null }
  ]);

  selectedIds = signal<string[]>([]);

  toggleCategory(id: string) {
    this.selectedIds.update(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  }

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  async onSave(): Promise<void> {
    localStorage.removeItem('pending_user_id');
    this.router.navigate(['/auth/login']);
  }

  skipInterests() {
    localStorage.removeItem('pending_user_id');
    this.router.navigate(['/auth/login']);
  }
}
