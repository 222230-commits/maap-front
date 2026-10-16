import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

/**
 * هذا الكومبوننت غير مستخدم في الـ routes الرئيسية.
 * الـ route /stores يشير لـ StoresComponent الموجود في stores.component.ts
 * والذي يستخدم BuyerService الحقيقي بالفعل.
 * هنا نعيد التوجيه احترازياً لو استُخدم من أي مكان.
 */
@Component({
  selector: 'app-stores-list',  template: ''
})
export class StoresListComponent implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {
    this.router.navigate(['/stores'], { replaceUrl: true });
  }
}
