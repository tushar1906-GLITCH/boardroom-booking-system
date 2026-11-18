import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Plus, Bell, Check, ExternalLink, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBookingModal } from '../../context/BookingModalContext';
import { notificationsApi } from '../../api/notifications.api';
import { NotificationItem } from '../../api/types';
import { toast } from 'sonner';

interface TopBarProps {
  onOpenMobile: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { openBookingModal } = useBookingModal();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number>(0);

  // Derive human-readable page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Overview Dashboard';
    if (path === '/rooms') return 'Meeting Rooms & Availability';
    if (path.startsWith('/rooms/')) return 'Room Details';
    if (path === '/calendar') return 'Company Meeting Calendar';
    if (path === '/my-bookings') return 'My Bookings & Reservations';
    if (path === '/notifications') return 'Notification Center';
    if (path === '/profile') return 'My Account & Preferences';
    if (path === '/admin/dashboard') return 'Administration Analytics';
    if (path === '/admin/rooms') return 'Room Management';
    if (path === '/admin/bookings') return 'Company-Wide Bookings';
    if (path === '/admin/users') return 'User & Role Management';
    return 'ReserveHub';
  };

  // Poll notifications unread count every 30s
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { unreadCount: count } = await notificationsApi.getUnreadCount();
        if (count > prevCountRef.current && prevCountRef.current !== 0) {
          toast.info('You have new meeting notifications.');
        }
        prevCountRef.current = count;
        setUnreadCount(count);
      } catch (err) {
        // Silent catch for background poll
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch recent notifications when dropdown opens
  const toggleNotifications = async () => {
    if (!dropdownOpen) {
      try {
        const res = await notificationsApi.getNotifications({ page: 1, pageSize: 5 });
        setRecentNotifications(res.data);
      } catch (err) {
        // Ignore error
      }
    }
    setDropdownOpen(!dropdownOpen);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Failed to mark notifications read');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-8 bg-surface/90 backdrop-blur-md border-b border-border">
      {/* Left Title and Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="p-2 text-slate-400 rounded-lg hover:bg-surface-50 lg:hidden"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">{getPageTitle()}</h1>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Book Button */}
        <button
          onClick={() => openBookingModal()}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Book a Room</span>
        </button>

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleNotifications}
            className="relative p-2 text-slate-300 rounded-xl hover:bg-surface-50 hover:text-white transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold font-mono text-white bg-primary rounded-full shadow-sm animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface-100 border border-border shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-surface-200">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Notifications ({unreadCount} unread)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-primary-light hover:underline flex items-center gap-1 font-medium"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No recent notifications
                  </div>
                ) : (
                  recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        notificationsApi.markAsRead(notif.id);
                        setDropdownOpen(false);
                        navigate('/my-bookings');
                      }}
                      className={`p-3.5 hover:bg-surface-50 cursor-pointer transition-colors ${
                        !notif.isRead ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-100">{notif.title}</p>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">{notif.message}</p>
                      <p className="mt-1.5 text-[10px] font-mono text-slate-500">
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 text-center border-t border-border/80 bg-surface-200">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/notifications');
                  }}
                  className="text-xs font-semibold text-primary-light hover:underline flex items-center justify-center gap-1 w-full"
                >
                  View all notifications
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
