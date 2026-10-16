import {
  ChangeDetectionStrategy,
  Component, inject, OnInit, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/admin.service';

@Component({
  selector: 'app-admin-shades',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './shades.component.html',
  styleUrl: './shades.component.scss'
})
export class ShadesComponent implements OnInit {
  private adminService = inject(AdminService);

  shades          = signal<any[]>([]);
  isLoading       = signal(true);
  showCreateModal = signal(false);
  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  selectedShade   = signal<any | null>(null);
  isSaving        = signal(false);
  isDeleting      = signal(false);
  actionError     = signal('');
  successMsg      = signal('');

  newName    = signal('');
  editName   = signal('');

  ngOnInit(): void {
    this.loadShades();
  }

  loadShades(): void {
    this.isLoading.set(true);
    this.adminService.getShades().subscribe({
      next: (res) => {
        const list = res?.data ?? res ?? [];
        this.shades.set(Array.isArray(list) ? list : []);
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
    this.adminService.createShade({ name }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showCreateModal.set(false);
        this.showSuccess('تم إضافة الدرجة بنجاح');
        this.loadShades();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.actionError.set(err?.error?.message ?? 'فشل إضافة الدرجة');
      }
    });
  }

  openEdit(shade: any): void {
    this.selectedShade.set(shade);
    this.editName.set(shade.name ?? '');
    this.actionError.set('');
    this.showEditModal.set(true);
  }

  saveEdit(): void {
    const shade = this.selectedShade();
    const name  = this.editName().trim();
    if (!shade || !name) return;
    this.isSaving.set(true);
    this.actionError.set('');
    this.adminService.updateShade(shade.id, { name }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showEditModal.set(false);
        this.showSuccess('تم تعديل الدرجة بنجاح');
        this.loadShades();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.actionError.set(err?.error?.message ?? 'فشل تعديل الدرجة');
      }
    });
  }

  openDelete(shade: any): void {
    this.selectedShade.set(shade);
    this.actionError.set('');
    this.showDeleteModal.set(true);
  }

  confirmDelete(): void {
    const shade = this.selectedShade();
    if (!shade) return;
    this.isDeleting.set(true);
    this.actionError.set('');
    this.adminService.deleteShade(shade.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.showSuccess('تم حذف الدرجة');
        this.loadShades();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.actionError.set(err?.error?.message ?? 'فشل حذف الدرجة');
      }
    });
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 3000);
  }
}
