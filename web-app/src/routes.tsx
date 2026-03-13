import { createBrowserRouter, Navigate, RouterProvider, Outlet } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthLayout } from './components/layout/AuthLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { GuestRoute } from './components/auth/GuestRoute';
import { Landing } from './pages/Landing';
import { Discover } from './pages/Discover';
import { Bookings } from './pages/Bookings';
import { Messages } from './pages/Messages';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { EditProfile } from './pages/EditProfile';
import { Welcome } from './pages/auth/Welcome';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Dashboard } from './pages/provider/Dashboard';
import { Onboarding } from './pages/provider/Onboarding';
import { ClientOnboarding } from './pages/client/Onboarding';
import { ProviderDetail } from './pages/ProviderDetail';
import { ChatThread } from './pages/ChatThread';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <Landing /> },
      {
        path: '',
        element: (
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        ),
        children: [
          { path: 'discover', element: <Discover /> },
          { path: 'providers/:id', element: <ProviderDetail /> },
          { path: 'bookings', element: <Bookings /> },
          { path: 'messages', element: <Messages /> },
          { path: 'messages/:userId', element: <ChatThread /> },
          { path: 'profile', element: <Profile /> },
          { path: 'settings', element: <Settings /> },
          { path: 'settings/edit-profile', element: <EditProfile /> },
          { path: 'provider/dashboard', element: <Dashboard /> },
          { path: 'provider/onboarding', element: <Onboarding /> },
          { path: 'client/onboarding', element: <ClientOnboarding /> },
        ],
      },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="/auth/welcome" replace /> },
      {
        path: 'welcome',
        element: (
          <GuestRoute>
            <Welcome />
          </GuestRoute>
        ),
      },
      {
        path: 'login',
        element: (
          <GuestRoute>
            <Login />
          </GuestRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <GuestRoute>
            <Register />
          </GuestRoute>
        ),
      },
      { path: 'reset-password', element: <ResetPassword /> },
    ],
  },
  { path: '/login', element: <Navigate to="/auth/login" replace /> },
  { path: '/register', element: <Navigate to="/auth/register" replace /> },
  { path: '/welcome', element: <Navigate to="/auth/welcome" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
