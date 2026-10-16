import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-prompt',  imports: [CommonModule],
  templateUrl: './login-prompt.component.html',
  styleUrl: './login-prompt.component.scss'
})
export class LoginPromptComponent {
  private router = inject(Router);

  isVisible = input<boolean>(false);
  closed = output<void>();

  goToRegister(): void {
    this.router.navigate(['/auth/register']);
    this.closed.emit();
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
    this.closed.emit();
  }

  close(): void {
    this.closed.emit();
  }
}
