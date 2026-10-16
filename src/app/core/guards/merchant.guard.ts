import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const merchantGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isBanned()) {
    return false;
  }

  if (authService.role() !== 'merchant') {
    await authService.refreshUser();
  }

  if (authService.isBanned()) {
    return false;
  }

  if (authService.role() === 'merchant' || authService.currentUser()?.role === 'seller' || (authService.currentUser()?.role as any) === 'merchant') {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
