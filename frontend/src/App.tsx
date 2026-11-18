import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { Shell } from './components/layout/Shell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { EmployeeDashboardPage } from './pages/dashboard/EmployeeDashboardPage';
import { AdminDashboardPage } from './pages/dashboard/AdminDashboardPage';
import { RoomsPage } from './pages/rooms/RoomsPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { MyBookingsPage } from './pages/bookings/MyBookingsPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { AdminRoomsPage } from './pages/admin/AdminRoomsPage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { NotFoundPage } from './pages/not-found/NotFoundPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Workspace Shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<EmployeeDashboardPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="my-bookings" element={<MyBookingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />

        {/* Administration Routes */}
        <Route
          path="admin/dashboard"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/rooms"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminRoomsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/bookings"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminBookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
