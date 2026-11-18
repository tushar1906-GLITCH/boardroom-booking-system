import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  CalendarCheck,
  CalendarX,
  Clock,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { notificationsApi } from '../../api/notifications.api';
import { NotificationType } from '../../api/types';
import { toast } from 'sonner';

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: notifsResponse, isLoading } = useQuery({
    queryKey: ['notifications-page', page],
    queryFn: () => notificationsApi.getNotifications({ page, pageSize: 12 }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read.');
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
    },
  });

  const notifications = notifsResponse?.data || [];
  const meta = notifsResponse?.meta;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
        return <CalendarCheck className="w-5 h-5 text-teal" />;
      case 'BOOKING_RESCHEDULED':
        return <RotateCcw className="w-5 h-5 text-primary-light" />;
      case 'BOOKING_CANCELLED':
      case 'BOOKING_CANCELLED_BY_ADMIN':
        return <CalendarX className="w-5 h-5 text-red-400" />;
      case 'BOOKING_REMINDER':
        return <Clock className="w-5 h-5 text-amber-400" />;
      case 'ROOM_UNAVAILABLE':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Notifications Center</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time meeting reminders, confirmations, and administrative updates
          </p>
        </div>

        <button
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-100 hover:bg-surface-50 text-xs font-semibold text-slate-200 border border-border transition-colors disabled:opacity-40"
        >
          <CheckCheck className="w-4 h-4 text-primary-light" />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 rounded-2xl bg-surface-100 border border-border animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-100 border border-border space-y-2">
          <Bell className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No notifications yet</h3>
          <p className="text-xs text-slate-400">
            You're completely caught up! We'll alert you here when meeting schedules change.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                if (!notif.isRead) markOneMutation.mutate(notif.id);
              }}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                !notif.isRead
                  ? 'bg-surface-100 border-primary/40 shadow-sm'
                  : 'bg-surface-100/60 border-border/70 hover:bg-surface-100'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-surface-200 border border-border shrink-0 mt-0.5">
                {getNotificationIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {notif.title}
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    {new Date(notif.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    •{' '}
                    {new Date(notif.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border text-xs font-mono">
              <span className="text-slate-400">
                Page {meta.page} of {meta.totalPages} ({meta.total} notifications)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-surface-100 border border-border disabled:opacity-40 text-slate-200"
                >
                  Previous
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-surface-100 border border-border disabled:opacity-40 text-slate-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
