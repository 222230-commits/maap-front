import {
  ChangeDetectionStrategy, Component, inject, OnInit,
  signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/admin.service';

type AdTargetType = 'external' | 'product' | 'shop' | 'category';

interface AdForm {
  title: string;
  target_type: AdTargetType;
  target_url: string;
  target_id: string;
  position: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

const EMPTY_FORM = (): AdForm => ({
  title: '', target_type: 'external', target_url: '', target_id: '',
  position: '', is_active: true, start_date: '', end_date: ''
});

@Component({
  selector: 'app-admin-ads',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './ads.component.html',
  styleUrl: './ads.component.scss'
})
export class AdsComponent implements OnInit {
  private adminService = inject(AdminService);

  // ── State ─────────────────────────────────────────────────────
  groupedAds   = signal<Record<string, any[]>>({});
  isLoading    = signal(true);
  successMsg   = signal('');
  actionError  = signal('');

  // Create flow (2-step)
  showCreateModal  = signal(false);
  createStep       = signal<1 | 2>(1);
  createdAdId      = signal<string | null>(null);
  isSaving         = signal(false);
  isUploadingImage = signal(false);
  createForm       = signal<AdForm>(EMPTY_FORM());
  imageFile        = signal<File | null>(null);
  imagePreview     = signal<string | null>(null);

  // Edit
  showEditModal = signal(false);
  editingAd     = signal<any | null>(null);
  editForm      = signal<AdForm>(EMPTY_FORM());
  isEditing     = signal(false);

  // Delete
  showDeleteModal = signal(false);
  deletingAd      = signal<any | null>(null);
  isDeleting      = signal(false);

  // Toggle image upload for existing ad
  showImageModal  = signal(false);
  imageForAd      = signal<any | null>(null);

  positions = computed(() => Object.keys(this.groupedAds()));

  ngOnInit(): void { this.loadAds(); }

  loadAds(): void {
    this.isLoading.set(true);
    this.adminService.getAds().subscribe({
      next: (res) => {
        this.groupedAds.set(res?.data ?? {});
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // ── Create flow ───────────────────────────────────────────────
  openCreate(): void {
    this.createForm.set(EMPTY_FORM());
    this.imageFile.set(null);
    this.imagePreview.set(null);
    this.createdAdId.set(null);
    this.createStep.set(1);
    this.actionError.set('');
    this.showCreateModal.set(true);
  }

  updateCreate(field: keyof AdForm, val: unknown): void {
    this.createForm.update(f => ({ ...f, [field]: val }));
  }

  saveStep1(): void {
    const f = this.createForm();
    if (!f.title.trim()) return;
    this.isSaving.set(true);
    this.actionError.set('');
    const payload: any = {
      title: f.title, target_type: f.target_type,
      is_active: f.is_active,
      position: f.position || null,
      start_date: f.start_date || null,
      end_date: f.end_date || null,
    };
    if (f.target_type === 'external') {
      payload.target_url = f.target_url || null;
    } else {
      payload.target_id = f.target_id || null;
    }
    this.adminService.createAd(payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.createdAdId.set(res?.data?.id ?? null);
        this.createStep.set(2);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.actionError.set(this.extractError(err));
      }
    });
  }

  onImageSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imageFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  uploadImageStep2(): void {
    const id   = this.createdAdId();
    const file = this.imageFile();
    if (!id || !file) return;
    this.isUploadingImage.set(true);
    this.actionError.set('');
    this.adminService.uploadAdImage(id, file).subscribe({
      next: () => {
        this.isUploadingImage.set(false);
        this.showCreateModal.set(false);
        this.showSuccess('تم إنشاء الإعلان بنجاح');
        this.loadAds();
      },
      error: (err) => {
        this.isUploadingImage.set(false);
        this.actionError.set(this.extractError(err));
      }
    });
  }

  skipImageUpload(): void {
    this.showCreateModal.set(false);
    this.showSuccess('تم إنشاء الإعلان — يمكنك رفع الصورة لاحقاً');
    this.loadAds();
  }

  // ── Edit ──────────────────────────────────────────────────────
  openEdit(ad: any): void {
    this.editingAd.set(ad);
    this.editForm.set({
      title:       ad.title ?? '',
      target_type: ad.target_type ?? 'external',
      target_url:  ad.target_url ?? '',
      target_id:   ad.target_id ?? '',
      position:    ad.position ?? '',
      is_active:   ad.is_active ?? true,
      start_date:  ad.start_date?.substring(0, 10) ?? '',
      end_date:    ad.end_date?.substring(0, 10) ?? '',
    });
    this.actionError.set('');
    this.showEditModal.set(true);
  }

  updateEdit(field: keyof AdForm, val: unknown): void {
    this.editForm.update(f => ({ ...f, [field]: val }));
  }

  saveEdit(): void {
    const ad = this.editingAd();
    const f  = this.editForm();
    if (!ad) return;
    this.isEditing.set(true);
    this.actionError.set('');
    const payload: any = {
      title: f.title, target_type: f.target_type,
      is_active: f.is_active,
      position: f.position || null,
      start_date: f.start_date || null,
      end_date: f.end_date || null,
    };
    if (f.target_type === 'external') {
      payload.target_url = f.target_url || null;
      payload.target_id = null;
    } else {
      payload.target_id = f.target_id || null;
      payload.target_url = null;
    }
    this.adminService.updateAd(ad.id, payload).subscribe({
      next: () => {
        this.isEditing.set(false);
        this.showEditModal.set(false);
        this.showSuccess('تم تعديل الإعلان بنجاح');
        this.loadAds();
      },
      error: (err) => {
        this.isEditing.set(false);
        this.actionError.set(this.extractError(err));
      }
    });
  }

  // ── Image update for existing ad ─────────────────────────────
  openImageUpload(ad: any): void {
    this.imageForAd.set(ad);
    this.imageFile.set(null);
    this.imagePreview.set(null);
    this.actionError.set('');
    this.showImageModal.set(true);
  }

  uploadExistingImage(): void {
    const ad   = this.imageForAd();
    const file = this.imageFile();
    if (!ad || !file) return;
    this.isUploadingImage.set(true);
    this.actionError.set('');
    this.adminService.uploadAdImage(ad.id, file).subscribe({
      next: () => {
        this.isUploadingImage.set(false);
        this.showImageModal.set(false);
        this.showSuccess('تم تحديث صورة الإعلان');
        this.loadAds();
      },
      error: (err) => {
        this.isUploadingImage.set(false);
        this.actionError.set(this.extractError(err));
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────
  openDelete(ad: any): void {
    this.deletingAd.set(ad);
    this.actionError.set('');
    this.showDeleteModal.set(true);
  }

  confirmDelete(): void {
    const ad = this.deletingAd();
    if (!ad) return;
    this.isDeleting.set(true);
    this.actionError.set('');
    this.adminService.deleteAd(ad.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.showSuccess('تم حذف الإعلان');
        this.loadAds();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.actionError.set(this.extractError(err));
      }
    });
  }

  // ── Toggle ────────────────────────────────────────────────────
  toggleStatus(ad: any): void {
    this.adminService.toggleAdStatus(ad.id).subscribe({
      next: (res) => {
        // is_active comes at root level, not in data
        this.groupedAds.update(grouped => {
          const updated = { ...grouped };
          for (const pos in updated) {
            updated[pos] = updated[pos].map(a =>
              a.id === ad.id ? { ...a, is_active: res.is_active } : a
            );
          }
          return updated;
        });
      },
      error: () => {}
    });
  }

  getPositionLabel(pos: string): string {
    const labels: Record<string, string> = {
      home_main_banner: 'البانر الرئيسي',
      popup_modal:      'نافذة منبثقة',
      '':               'غير مصنّف',
    };
    return labels[pos] ?? pos;
  }

  getTargetTypeLabel(t: string): string {
    const m: Record<string, string> = {
      external: 'رابط خارجي', product: 'منتج',
      shop: 'متجر', category: 'تصنيف'
    };
    return m[t] ?? t;
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 3500);
  }

  private extractError(err: any): string {
    if (err?.error?.errors) {
      return Object.values(err.error.errors).flat().join(' — ');
    }
    return err?.error?.message ?? 'حدث خطأ، حاول مرة أخرى';
  }
}
