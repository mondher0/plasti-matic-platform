import { Routes, Route } from 'react-router-dom';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { LoginPage } from '@/features/auth/pages/login-page';
import { RegisterPage } from '@/features/auth/pages/register-page';
import { CatalogPage } from '@/features/catalog/pages/catalog-page';
import { ProductDetailPage } from '@/features/catalog/pages/product-detail-page';
import { CheckoutPage } from '@/features/orders/pages/checkout-page';
import { OrderConfirmationPage } from '@/features/orders/pages/order-confirmation-page';
import { OrderHistoryPage } from '@/features/orders/pages/order-history-page';
import { AccountProfilePage } from '@/features/account/pages/account-profile-page';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<StorefrontLayout />}>
        <Route index element={<CatalogPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/account/orders" element={<OrderHistoryPage />} />
          <Route path="/account/profile" element={<AccountProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
