import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { merchantGuard } from './core/guards/merchant.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(c => c.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then(c => c.HomeComponent)
      },
      {
        path: 'products/:id',
        loadComponent: () => import('./features/products/product-details/product-details.component')
          .then(c => c.ProductDetailsComponent)
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/profile/profile.component')
          .then(c => c.ProfileComponent)
      },
      {
        path: 'cart',
        canActivate: [authGuard],
        loadComponent: () => import('./features/cart/cart.component')
          .then(c => c.CartComponent)
      },
      {
        path: 'wishlist',
        loadComponent: () => import('./features/wishlist/wishlist.component').then(c => c.WishlistComponent)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications.component').then(c => c.NotificationsComponent)
      },
      {
        // بروفايل عام لأي مشتري آخر — مختلف تماماً عن /profile (الخاص بالمستخدم الحالي)
        path: 'buyers/:buyerId',
        loadComponent: () => import('./features/buyer-profile/buyer-profile.component')
          .then(c => c.BuyerProfileComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/products-list/products-list.component')
          .then(c => c.ProductsListComponent)
      },
      {
        path: 'stores',
        loadComponent: () => import('./features/stores/stores.component').then(c => c.StoresComponent)
      },
      {
        path: 'stores/:id',
        loadComponent: () => import('./features/stores/store-profile/store-profile.component')
          .then(c => c.StoreProfileComponent)
      },
      {
        path: 'become-merchant',
        loadComponent: () => import(
          './features/merchant-upgrade/merchant-upgrade.component'
        ).then(c => c.MerchantUpgradeComponent)
      },
      {
        path: 'orders',
        canActivate: [authGuard],
        loadComponent: () => import('./features/orders/orders.component')
          .then(c => c.OrdersComponent)
      },
      {
        path: 'orders/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./features/orders/order-details/order-details.component')
          .then(c => c.OrderDetailsComponent)
      },
      {
        path: 'checkout/:shopId',
        canActivate: [authGuard],
        loadComponent: () => import('./features/checkout/checkout.component')
          .then(c => c.CheckoutComponent)
      },
      {
        path: 'terms',
        loadComponent: () => import(
          './features/terms/terms.component'
        ).then(c => c.TermsComponent)
      },
      {
        path: 'support',
        loadComponent: () => import(
          './features/support/support.component'
        ).then(c => c.SupportComponent)
      },
      {
        path: 'faq',
        redirectTo: 'support',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(c => c.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./auth/login/login.component').then(c => c.LoginComponent)
      },
      {
        path: 'admin-login',
        loadComponent: () => import('./auth/admin-login/admin-login.component')
          .then(c => c.AdminLoginComponent)
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () => import('./auth/register/register.component').then(c => c.RegisterComponent)
      },
      {
        path: 'merchant-apply',
        loadComponent: () => import('./auth/merchant-apply/merchant-apply.component').then(c => c.MerchantApplyComponent)
      },
      {
        path: 'verify-otp',
        loadComponent: () => import('./auth/verify-otp/verify-otp.component')
          .then(c => c.VerifyOtpComponent)
      },
      {
        path: 'interests',
        loadComponent: () => import('./auth/interests/interests.component')
          .then(c => c.InterestsComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./auth/forgot-password/forgot-password.component')
          .then(c => c.ForgotPasswordComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./auth/reset-password/reset-password.component')
          .then(c => c.ResetPasswordComponent)
      },
      {
        path: 'change-password',
        loadComponent: () => import('./auth/change-password/change-password.component')
          .then(c => c.ChangePasswordComponent)
      }
    ]
  },
  {
    path: 'merchant',
    canActivate: [merchantGuard],
    loadComponent: () => import('./layouts/dashboard-layout/dashboard-layout.component').then(c => c.DashboardLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./merchant/dashboard/dashboard.component').then(c => c.DashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./merchant/products/products.component').then(c => c.ProductsComponent)
      },
      {
        path: 'products/create',
        loadComponent: () => import('./merchant/products/create-product/create-product.component').then(c => c.CreateProductComponent)
      },
      {
        path: 'products/edit/:id',
        loadComponent: () => import('./merchant/products/edit-product/edit-product.component').then(c => c.EditProductComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./merchant/orders/orders.component').then(c => c.OrdersComponent)
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./merchant/orders/order-detail/order-detail.component').then(c => c.OrderDetailComponent)
      },

      {
        path: 'store-settings',
        loadComponent: () => import('./merchant/store-settings/store-settings.component').then(c => c.StoreSettingsComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./merchant/merchant-profile/merchant-profile.component').then(c => c.MerchantProfileComponent)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./merchant/notifications/merchant-notifications.component').then(c => c.MerchantNotificationsComponent)
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./layouts/dashboard-layout/dashboard-layout.component').then(c => c.DashboardLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./admin/dashboard/admin-dashboard.component').then(c => c.AdminDashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./admin/products/admin-products.component').then(c => c.AdminProductsComponent)
      },
      {
        path: 'applications',
        loadComponent: () => import('./admin/applications/applications.component').then(c => c.ApplicationsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./admin/users/users.component').then(c => c.UsersComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./admin/reports/reports.component').then(c => c.ReportsComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./admin/categories/categories.component').then(c => c.CategoriesComponent)
      },
      {
        path: 'seasons',
        loadComponent: () => import('./admin/seasons/seasons.component').then(c => c.SeasonsComponent)
      },
      {
        path: 'admins',
        loadComponent: () => import('./admin/admins/admins.component').then(c => c.AdminsComponent)
      },
      {
        path: 'shops',
        loadComponent: () => import('./admin/shops/shops.component').then(c => c.ShopsComponent)
      },
      {
        path: 'shades',
        loadComponent: () => import('./admin/shades/shades.component').then(c => c.ShadesComponent)
      },
      {
        path: 'colors',
        loadComponent: () => import('./admin/colors/colors.component').then(c => c.ColorsComponent)
      },
      {
        path: 'sizes',
        loadComponent: () => import('./admin/sizes/sizes.component').then(c => c.SizesComponent)
      },
      {
        path: 'ads',
        loadComponent: () => import('./admin/ads/ads.component').then(c => c.AdsComponent)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./admin/send-notification/send-notification.component').then(c => c.SendNotificationComponent)
      }

    ]
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.component').then(c => c.NotFoundComponent)
  }
];
