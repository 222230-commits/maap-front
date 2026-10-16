import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    <div style="min-height:100vh; display:flex; flex-direction:column;">
      <app-navbar></app-navbar>
      <main style="flex:1; padding-top:64px;">
        <router-outlet></router-outlet>
      </main>
      <app-footer></app-footer>
    </div>
  `,
  styles: ``
})
export class MainLayoutComponent implements OnInit {
  private cartService = inject(CartService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    // لو المستخدم مسجل دخول → حمّل السلة فوراً حتى يظهر العداد في الـ navbar
    if (this.authService.isLoggedIn()) {
      this.cartService.loadCart().subscribe();
    }
  }
}
