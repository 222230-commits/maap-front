import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminMockService } from '@core/api/mock/admin.mock.service';

@Component({
  selector: 'app-admins',  imports: [CommonModule],
  templateUrl: './admins.component.html',
  styleUrl: './admins.component.scss'
})
export class AdminsComponent {
  adminService = inject(AdminMockService);
  admins = this.adminService.admins;
  showAddModal = signal(false);
  
  newAdmin = signal({
    name: '', email: '', isSuperAdmin: false,
    joinDate: new Date().toISOString(),
    permissions: {
      manageApplications: true,
      manageUsers: true,
      manageReports: true,
      manageCategories: false,
      manageSeasons: false,
      manageAdmins: false
    }
  });

  updateField(field: string, value: any) {
    this.newAdmin.update(a => ({...a, [field]: value}));
  }

  updatePermission(perm: string, value: boolean) {
    this.newAdmin.update(a => ({
      ...a,
      permissions: {...a.permissions, [perm]: value}
    }));
  }

  saveAdmin() {
    this.adminService.addAdmin(this.newAdmin() as any);
    this.showAddModal.set(false);
  }
}
