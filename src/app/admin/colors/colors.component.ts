import {
  ChangeDetectionStrategy,
  Component, inject, OnInit, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/admin.service';

@Component({
  selector: 'app-admin-colors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './colors.component.html',
  styleUrl: './colors.component.scss'
})
export class ColorsComponent implements OnInit {
  private adminService = inject(AdminService);

  colors          = signal<any[]>([]);
  isLoading       = signal(true);
  showCreateModal = signal(false);
  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  selectedColor   = signal<any | null>(null);
  isSaving        = signal(false);
  isDeleting      = signal(false);
  actionError     = signal('');
  successMsg      = signal('');

  newName    = signal('');
  newHex     = signal('');
  editName   = signal('');
  editHex    = signal('');

  ngOnInit(): void {
    this.loadColors();
  }

  loadColors(): void {
    this.isLoading.set(true);
    this.adminService.getColors().subscribe({
      next: (res) => {
        const list = res?.data ?? res ?? [];
        this.colors.set(Array.isArray(list) ? list : []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreate(): void {
    this.newName.set('');
    this.newHex.set('#000000');
    this.actionError.set('');
    this.showCreateModal.set(true);
  }

  saveCreate(): void {
    const name = this.newName().trim();
    if (!name) return;
    this.isSaving.set(true);
    this.actionError.set('');
    const data: any = { name };
    const hex = this.newHex().trim();
    if (hex) data['hex_code'] = hex;
    this.adminService.createColor(data).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showCreateModal.set(false);
        this.showSuccess('تم إضافة اللون بنجاح');
        this.loadColors();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.actionError.set(err?.error?.message ?? 'فشل إضافة اللون');
      }
    });
  }

  openEdit(color: any): void {
    this.selectedColor.set(color);
    this.editName.set(color.name ?? '');
    this.editHex.set(color.hex_code ?? '#000000');
    this.actionError.set('');
    this.showEditModal.set(true);
  }

  saveEdit(): void {
    const color = this.selectedColor();
    const name  = this.editName().trim();
    if (!color || !name) return;
    this.isSaving.set(true);
    this.actionError.set('');
    const data: any = { name };
    const hex = this.editHex().trim();
    if (hex) data['hex_code'] = hex;
    this.adminService.updateColor(color.id, data).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showEditModal.set(false);
        this.showSuccess('تم تعديل اللون بنجاح');
        this.loadColors();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.actionError.set(err?.error?.message ?? 'فشل تعديل اللون');
      }
    });
  }

  openDelete(color: any): void {
    this.selectedColor.set(color);
    this.actionError.set('');
    this.showDeleteModal.set(true);
  }

  confirmDelete(): void {
    const color = this.selectedColor();
    if (!color) return;
    this.isDeleting.set(true);
    this.actionError.set('');
    this.adminService.deleteColor(color.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.showSuccess('تم حذف اللون');
        this.loadColors();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.actionError.set(err?.error?.message ?? 'فشل حذف اللون');
      }
    });
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 3000);
  }
}
