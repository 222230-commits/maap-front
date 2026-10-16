import {
  ChangeDetectionStrategy,
  Component, inject, OnInit, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/admin.service';

@Component({
  selector: 'app-admin-sizes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './sizes.component.html',
  styleUrl: './sizes.component.scss'
})
export class SizesComponent implements OnInit {
  private adminService = inject(AdminService);

  sizes           = signal<any[]>([]);
  isLoading       = signal(true);
  showCreateModal = signal(false);
  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  selectedSize    = signal<any | null>(null);
  isSaving        = signal(false);
  isDeleting      = signal(false);
  actionError     = signal('');
  successMsg      = signal('');

  newName    = signal('');
  editName   = signal('');

  ngOnInit(): void {
    this.loadSizes();
  }

  loadSizes(): void {
    this.isLoading.set(true);
    this.adminService.getSizes().subscribe({
      next: (res) => {
        const list = res?.data ?? res ?? [];
        this.sizes.set(Array.isArray(list) ? list : []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreate(): void {
    this.newName.set('');
    this.actionError.set('');
    this.showCreateModal.set(true);
  }

  saveCreate(): void {
    const name = this.newName().trim();
    if (!name) return;
    this.isSaving.set(true);
    this.actionError.set('');
    this.adminService.createSize({ name }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showCreateModal.set(false);
        this.showSuccess('تم إضافة المقاس بنجاح');
        this.loadSizes();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.actionError.set(err?.error?.message ?? 'فشل إضافة المقاس');
      }
    });
  }

  openEdit(size: any): void {
    this.selectedSize.set(size);
    this.editName.set(size.name ?? '');
    this.actionError.set('');
    this.showEditModal.set(true);
  }

  saveEdit(): void {
    const size = this.selectedSize();
    const name = this.editName().trim();
    if (!size || !name) return;
    this.isSaving.set(true);
    this.actionError.set('');
    this.adminService.updateSize(size.id, { name }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showEditModal.set(false);
        this.showSuccess('تم تعديل المقاس بنجاح');
        this.loadSizes();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.actionError.set(err?.error?.message ?? 'فشل تعديل المقاس');
      }
    });
  }

  openDelete(size: any): void {
    this.selectedSize.set(size);
    this.actionError.set('');
    this.showDeleteModal.set(true);
  }

  confirmDelete(): void {
    const size = this.selectedSize();
    if (!size) return;
    this.isDeleting.set(true);
    this.actionError.set('');
    this.adminService.deleteSize(size.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.showSuccess('تم حذف المقاس');
        this.loadSizes();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.actionError.set(err?.error?.message ?? 'فشل حذف المقاس');
      }
    });
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 3000);
  }
}
