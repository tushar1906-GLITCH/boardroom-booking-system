import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  Search,
  Filter,
  Calendar,
  Clock,
  DoorOpen,
  Users,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { bookingsApi } from '../../api/bookings.api';
import { roomsApi } from '../../api/rooms.api';
import { CancelConfirmModal } from '../../components/bookings/CancelConfirmModal';
import { Booking } from '../../api/types';

export const AdminBookingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [roomId, setRoomId] = useState('');
  const [page, setPage] = useState(1);

  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);

  // Load rooms for filter
  const { data: roomsData } = useQuery({
    queryKey: ['rooms-all-active'],
    queryFn: () => roomsApi.getRooms({ pageSize: 50 }),
  });
  const rooms = roomsData?.data || [];

  // Query all bookings
  const { data: bookingsResponse, isLoading, refetch } = useQuery({
    queryKey: ['admin-bookings', search, status, roomId, page],
    queryFn: () =>
      bookingsApi.getAllBookingsAdmin({
        search: search || undefined,
        status: status || undefined,
        roomId: roomId || undefined,
        page,
        pageSize: 12,
      }),
  });

  const bookings = bookingsResponse?.data || [];
  const meta = bookingsResponse?.meta;

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setRoomId('');
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Enterprise Booking Registry
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Audit, inspect details, and manage meeting room reservations across all teams and departments
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-surface-100 border border-border grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            placeholder="Search by title, organizer, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full px-3.5 py-2 pl-9 rounded-xl bg-surface-200 border border-border text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-surface-200 border border-border text-xs text-slate-200 focus:outline-none focus:border-primary font-mono"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div>
          <select
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-surface-200 border border-border text-xs text-slate-200 focus:outline-none focus:border-primary font-mono"
          >
            <option value="">All Rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-surface-100 border border-border overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-200/80 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <th className="p-4">Meeting Title</th>
                <th className="p-4">Room</th>
                <th className="p-4">Organizer</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-surface-50/50 transition-colors">
                  <td className="p-4">
                    <span className="font-bold text-white text-sm block">{b.title}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {b.attendeeCount} attendees • {b.rescheduleCount > 0 ? `Rescheduled (${b.rescheduleCount}x)` : 'Original slot'}
                    </span>
                  </td>

                  <td className="p-4 text-slate-300">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: b.room?.accentColor || '#7C6CFF' }}
                      />
                      {b.room?.name}
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="font-semibold text-slate-200 block">{b.user?.fullName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{b.user?.email}</span>
                  </td>

                  <td className="p-4 font-mono text-slate-300">
                    <div>
                      {new Date(b.startTime).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                        b.status === 'CONFIRMED'
                          ? 'bg-teal/15 text-teal border-teal/30'
                          : 'bg-red-500/15 text-red-300 border-red-500/30'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    {b.status === 'CONFIRMED' && (
                      <button
                        onClick={() => setSelectedBookingForCancel(b)}
                        className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold border border-red-500/30 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Page {meta.page} of {meta.totalPages} ({meta.total} bookings total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-surface-200 border border-border disabled:opacity-40 text-slate-200"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-surface-200 border border-border disabled:opacity-40 text-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <CancelConfirmModal
        booking={selectedBookingForCancel}
        isOpen={!!selectedBookingForCancel}
        onClose={() => {
          setSelectedBookingForCancel(null);
          refetch();
        }}
      />
    </div>
  );
};
