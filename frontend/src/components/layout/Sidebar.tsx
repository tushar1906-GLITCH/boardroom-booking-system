import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  DoorOpen,
  CalendarDays,
  Clock,
  Bell,
  User,
  Shield,
  Layers,
  Users,
  LogOut,
  X,
  Building2,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
      isActive
        ? 'bg-primary/15 text-primary-light font-semibold shadow-sm border border-primary/25'
        : 'text-slate-400 hover:text-slate-100 hover:bg-surface-50/60',
    );

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={clsx(
          'fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-surface border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-glow">
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                ReserveHub
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/20 text-primary-light border border-primary/30">
                  v1.0
                </span>
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 rounded-lg hover:bg-surface-50 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {/* Main Workspace */}
          <div>
            <p className="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase font-mono">
              Workspace
            </p>
            <nav className="space-y-1">
              <NavLink to="/dashboard" className={navItemClass} onClick={onCloseMobile}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/rooms" className={navItemClass} onClick={onCloseMobile}>
                <DoorOpen className="w-4 h-4" />
                <span>Meeting Rooms</span>
              </NavLink>

              <NavLink to="/calendar" className={navItemClass} onClick={onCloseMobile}>
                <CalendarDays className="w-4 h-4" />
                <span>Calendar View</span>
              </NavLink>

              <NavLink to="/my-bookings" className={navItemClass} onClick={onCloseMobile}>
                <Clock className="w-4 h-4" />
                <span>My Bookings</span>
              </NavLink>

              <NavLink to="/notifications" className={navItemClass} onClick={onCloseMobile}>
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </NavLink>
            </nav>
          </div>

          {/* Admin Section (Conditional) */}
          {user?.role === 'ADMIN' && (
            <div>
              <p className="px-3 mb-2 text-[11px] font-bold tracking-wider text-primary-light/80 uppercase font-mono flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-primary" />
                Administration
              </p>
              <nav className="space-y-1">
                <NavLink to="/admin/dashboard" className={navItemClass} onClick={onCloseMobile}>
                  <Building2 className="w-4 h-4" />
                  <span>Admin Analytics</span>
                </NavLink>

                <NavLink to="/admin/rooms" className={navItemClass} onClick={onCloseMobile}>
                  <Layers className="w-4 h-4" />
                  <span>Manage Rooms</span>
                </NavLink>

                <NavLink to="/admin/bookings" className={navItemClass} onClick={onCloseMobile}>
                  <CalendarCheck className="w-4 h-4" />
                  <span>All Bookings</span>
                </NavLink>

                <NavLink to="/admin/users" className={navItemClass} onClick={onCloseMobile}>
                  <Users className="w-4 h-4" />
                  <span>Manage Users</span>
                </NavLink>
              </nav>
            </div>
          )}
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-border/80 bg-surface-200/50">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-50/50 transition-colors">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/20 text-primary-light font-bold text-sm border border-primary/30">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{user?.fullName}</p>
              <div className="flex items-center gap-1.5">
                <span
                  className={clsx(
                    'text-[10px] font-mono font-medium px-1.5 py-0.2 rounded',
                    user?.role === 'ADMIN'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-slate-700/40 text-slate-300',
                  )}
                >
                  {user?.role}
                </span>
                <span className="text-xs text-slate-500 truncate">{user?.department || 'Employee'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/40">
            <NavLink
              to="/profile"
              onClick={onCloseMobile}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-50 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              Profile
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
