import {
  Component, ElementRef, inject, signal,
  ViewChild, ChangeDetectionStrategy, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/admin.service';

@Component({
  selector: 'app-admin-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit {
  private adminService = inject(AdminService);

  categories       = signal<any[]>([]);
  isLoading        = signal(true);
  showEditModal    = signal(false);
  showDeleteModal  = signal(false);
  showCreateModal  = signal(false);
  selectedCategory = signal<any | null>(null);
  isSaving         = signal(false);
  isDeleting       = signal(false);
  actionError      = signal('');

  // حقل الاسم في الايبياي هو 'name' فقط
  newCategory = signal<{ name: string; parent_id: string }>({
    name: '', parent_id: ''
  });

  // ── Image Upload ─────────────────────────────────────
  @ViewChild('categoryFileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  isUploadingImageId = signal<string | null>(null);
  private uploadTargetId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    // GET /admin/categories?type=all
    this.adminService.getCategories().subscribe({
      next: (res) => {
        // الاستجابة: { data: { data: [] } } أو { data: [] }
        const inner = res?.data?.data ?? res?.data ?? res ?? [];
        this.categories.set(
          (Array.isArray(inner) ? inner : []).map(c => this.mapCat(c))
        );
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  private mapCat(cat: any): any {
    return {
      id:            cat.id,
      // الايبياي يرجع 'name' فقط
      nameAr:        cat.name ?? cat.name_ar ?? cat.nameAr ?? '',
      name:          cat.name ?? cat.name_en ?? '',
      icon:          cat.icon ?? '',
      isActive:      cat.is_active ?? cat.isActive ?? true,
      productsCount: cat.products_count ?? cat.productsCount ?? 0,
      parentId:      cat.parent_id ?? null,
      deletedAt:     cat.deleted_at ?? null,
    };
  }

  openEdit(cat: any): void {
    this.selectedCategory.set({ ...cat });
    this.actionError.set('');
    this.showEditModal.set(true);
  }

  openDelete(cat: any): void {
    this.selectedCategory.set(cat);
    this.actionError.set('');
    this.showDeleteModal.set(true);
  }

  openCreate(): void {
    this.newCategory.set({ name: '', parent_id: '' });
    this.actionError.set('');
    this.showCreateModal.set(true);
  }

  saveCreate(): void {
    const cat = this.newCategory();
    if (!cat.name.trim()) return;
    this.isSaving.set(true);
    this.actionError.set('');
    const payload: { name: string; parent_id?: string } = { name: cat.name.trim() };
    if (cat.parent_id) payload['parent_id'] = cat.parent_id;

    // POST /admin/categories/store
    this.adminService.createCategory(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showCreateModal.set(false);
        this.loadCategories();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.actionError.set(err?.error?.message ?? 'فشل إنشاء التصنيف');
      }
    });
  }

  saveEdit(): void {
    const selected = this.selectedCategory();
    if (!selected) return;
    this.isSaving.set(true);
    this.actionError.set('');
    // الايبياي يقبل 'name' فقط
    const payload: { name?: string } = {
      name: selected.nameAr || selected.name,
    };
    // PUT /admin/categories/{id}/update
    this.adminService.updateCategory(selected.id, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showEditModal.set(false);
        this.loadCategories();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.actionError.set(err?.error?.message ?? 'فشل حفظ التعديلات');
      }
    });
  }

  confirmDelete(): void {
    const selected = this.selectedCategory();
    if (!selected) return;
    this.isDeleting.set(true);
    this.actionError.set('');
    // DELETE /admin/categories/{id}/delete (soft delete)
    this.adminService.deleteCategory(selected.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.loadCategories();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.actionError.set(err?.error?.message ?? 'فشل حذف التصنيف');
      }
    });
  }

  restoreCategory(cat: any): void {
    // POST /admin/categories/{id}/restore
    this.adminService.restoreCategory(cat.id).subscribe({
      next: () => this.loadCategories(),
      error: (err) => console.error('فشل استعادة التصنيف', err)
    });
  }

  updateEditField(field: string, value: string): void {
    this.selectedCategory.update(c => c ? { ...c, [field]: value } : c);
  }

  updateNewField(field: string, value: string): void {
    this.newCategory.update(c => ({ ...c, [field]: value }));
  }

  viewShops(cat: any): void {
    console.log('عرض متاجر التصنيف:', cat.nameAr);
  }

  triggerUpload(catId: string): void {
    this.uploadTargetId.set(catId);
    this.fileInputRef.nativeElement.value = '';
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    const id   = this.uploadTargetId();
    if (!file || !id) return;
    this.isUploadingImageId.set(id);
    // POST /admin/categories/{id}/image
    this.adminService.uploadCategoryImage(String(id), file).subscribe({
      next: () => {
        this.isUploadingImageId.set(null);
        this.uploadTargetId.set(null);
        this.loadCategories();
      },
      error: () => {
        this.isUploadingImageId.set(null);
      }
    });
  }
}
