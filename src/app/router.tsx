import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/layout/ProtectedRoute';
import { AppLayout } from '@/shared/layout/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { OrdersBoardPage } from '@/features/orders/OrdersBoardPage';
import { OrderDetailPage } from '@/features/orders/OrderDetailPage';
import { MenuHome } from '@/features/menu/MenuHome';
import { CategoriesPage } from '@/features/menu/CategoriesPage';
import { ProductsPage } from '@/features/menu/ProductsPage';
import { ProductFormPage } from '@/features/menu/ProductFormPage';
import { CustomizationsPage } from '@/features/menu/CustomizationsPage';
import { CakeOfDayPage } from '@/features/menu/CakeOfDayPage';
import { HomeBannerPage } from '@/features/menu/HomeBannerPage';
import { CustomersPage } from '@/features/customers/CustomersPage';
import { CustomerDetailPage } from '@/features/customers/CustomerDetailPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { PickupSettingsPage } from '@/features/settings/PickupSettingsPage';
import { OnboardingPage } from '@/features/settings/OnboardingPage';
import { StampCardSettingsPage } from '@/features/settings/StampCardSettingsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/orders', element: <OrdersBoardPage /> },
          { path: '/orders/:id', element: <OrderDetailPage /> },
          {
            element: <ProtectedRoute management />,
            children: [
              { path: '/menu', element: <MenuHome /> },
              { path: '/menu/categories', element: <CategoriesPage /> },
              { path: '/menu/products', element: <ProductsPage /> },
              { path: '/menu/products/new', element: <ProductFormPage /> },
              {
                path: '/menu/products/:id/edit',
                element: <ProductFormPage />,
              },
              {
                path: '/menu/customizations',
                element: <CustomizationsPage />,
              },
              { path: '/menu/cake-of-day', element: <CakeOfDayPage /> },
              { path: '/menu/home-banner', element: <HomeBannerPage /> },
              { path: '/settings/onboarding', element: <OnboardingPage /> },
              { path: '/settings/pickup', element: <PickupSettingsPage /> },
              { path: '/settings/stamp-card', element: <StampCardSettingsPage /> },
              { path: '/customers', element: <CustomersPage /> },
              { path: '/customers/:id', element: <CustomerDetailPage /> },
              { path: '/reports', element: <ReportsPage /> },
              { path: '/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
