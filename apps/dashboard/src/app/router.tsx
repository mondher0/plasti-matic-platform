import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminRoute } from '@/components/admin-route';
import { LoginPage } from '@/features/auth/pages/login-page';
import { OverviewPage } from '@/features/analytics/pages/overview-page';
import { AdvancedAnalyticsPage } from '@/features/analytics/pages/advanced-analytics-page';
import { CatalogPage } from '@/features/catalog/pages/catalog-page';
import { InventoryPage } from '@/features/inventory/pages/inventory-page';
import { ProductionPage } from '@/features/production/pages/production-page';
import { OrdersPage } from '@/features/orders/pages/orders-page';
import { UsersPage } from '@/features/users/pages/users-page';
import { AccountPage } from '@/features/account/pages/account-page';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="/analytics" element={<AdvancedAnalyticsPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/production" element={<ProductionPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
