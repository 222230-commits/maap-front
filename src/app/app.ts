import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { SplashScreenComponent } from './shared/components/splash-screen/splash-screen.component';
import { BannedModalComponent } from './shared/components/banned-modal/banned-modal.component';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, CommonModule, SplashScreenComponent, BannedModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('ourwebsite');
  public authService = inject(AuthService);
  private router = inject(Router);
  showSplash = signal(true);

  ngOnInit(): void {
    setTimeout(() => this.showSplash.set(false), 2500);
  }

  logoutBanned(): void {
    this.authService.logout();
  }

  goToSupport(): void {
    this.router.navigate(['/support']);
  }
}
