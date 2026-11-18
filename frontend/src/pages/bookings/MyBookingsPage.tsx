import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  DoorOpen,
  Users,
  Search,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  CalendarDays,
  Plus,
} from 'lucide-react';
import { bookingsApi } from '../../api/bookings.api';
import { roomsApi } from '../../api/rooms.api';
import { useBookingModal } from '../../context/BookingModalContext';
import { RescheduleModal } from '../../components/bookings/RescheduleModal';
import { CancelConfirmModal } from '../../components/bookings/CancelConfirmModal';
import { Booking } from '../../api/types';

export const MyBookingsPage: React.FC = () => {
  const { openBookingModal } = useBookingModal();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [search, setSearch] = useState('');
  const [roomId, setRoomId] = useState('');
  const [page, setPage] = useState(1);

  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<Booking | null>(null);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);

  // Load rooms for filter dropdown
  const { data: roomsData } = useQuery({
    queryKey: ['rooms-all-active'],
    queryFn: () => roomsApi.getRooms({ pageSize: 50 }),
  });
  const rooms = roomsData?.data || [];

  // Query bookings based on activeTab
  const { data: bookingsResponse, isLoading, refetch } = useQuery({
    queryKey: ['my-bookings', activeTab, search, roomId, page],
    queryFn: () =>
      bookingsApi.getMyBookings({
        scope: activeTab,
        search: search || undefined,
        roomId: roomId || undefined,
        page,
        pageSize: 10,
      }),
  });

  const bookings = bookingsResponse?.data || [];
  const meta = bookingsResponse?.meta;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">My Bookings</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your active reservations, reschedule time slots, or review past meeting history
          </p>
        </div>

        <button
          onClick={() => openBookingModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow self-start sm:self-auto transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Booking</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('upcoming');
              setPage(1);
            }}
            className={`pb-3 px-3 text-xs font-semibold font-mono uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'upcoming'
                ? 'border-primary text-primary-light font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Upcoming Meetings
          </button>

          <button
            onClick={() => {
              setActiveTab('past');
              setPage(1);
            }}
            className={`pb-3 px-3 text-xs font-semibold font-mono uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'past'
                ? 'border-primary text-primary-light font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Past (Completed)
          </button>

          <button
            onClick={() => {
              setActiveTab('cancelled');
              setPage(1);
            }}
            className={`pb-3 px-3 text-xs font-semibold font-mono uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'cancelled'
                ? 'border-primary text-primary-light font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-100 border border-border">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            placeholder="Search bookings by meeting title or notes..."
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

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 rounded-2xl bg-surface-100 border border-border animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-100 border border-border space-y-3">
          <CalendarDays className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No {activeTab} bookings found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeTab === 'upcoming'
              ? 'You have no future meetings scheduled. Need a workspace?'
              : `No ${activeTab} records match the current filter.`}
          </p>
          {activeTab === 'upcoming' && (
            <button
              onClick={() => openBookingModal()}
              className="px-4 py-2 rounded-xl bg-primary text-xs font-semibold text-white shadow-glow"
            >
              Book a Meeting Room Now
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {bookings.map((booking) => {
            const isConfirmed = booking.status === 'CONFIRMED';
            const isUpcoming = isConfirmed && new Date(booking.endTime) >= new Date();

            return (
              <div
                key={booking.id}
                className="p-5 rounded-2xl bg-surface-100 border border-border hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {/* Room Accent Dot */}
                  <div
                    className="w-2.5 h-12 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: booking.room?.accentColor || '#7C6CFF' }}
                  />

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-white">{booking.title}</h4>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          booking.status === 'CANCELLED'
                            ? 'bg-red-500/10 text-red-300 border-red-500/20'
                            : isUpcoming
                            ? 'bg-teal/15 text-teal border-teal/30'
                            : 'bg-slate-700/40 text-slate-300 border-slate-600'
                        }`}
                      >
                        {booking.status === 'CANCELLED'
                          ? 'Cancelled'
                          : isUpcoming
                          ? 'Upcoming'
                          : 'Completed'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-slate-200 font-medium">
                        <DoorOpen className="w-3.5 h-3.5 text-primary" />
                        {booking.room?.name}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1 font-mono text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(booking.startTime).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1 font-mono text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1 font-mono text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {booking.attendeeCount} Attendees
                      </span>
                    </div>

                    {booking.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">
                        "{booking.description}"
                      </p>
                    )}

                    {booking.status === 'CANCELLED' && booking.cancellationReason && (
                      <p className="text-xs text-red-300 mt-1 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 inline-block font-mono">
                        Reason: {booking.cancellationReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions (if upcoming) */}
                {isUpcoming && (
                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0 pt-2 md:pt-0">
                    <button
                      onClick={() => setSelectedBookingForReschedule(booking)}
                      className="px-3.5 py-1.5 rounded-xl bg-surface-200 hover:bg-surface-50 text-xs font-semibold text-slate-200 border border-border transition-colors"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => setSelectedBookingForCancel(booking)}
                      className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-300 border border-red-500/30 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border text-xs font-mono">
              <span className="text-slate-400">
                Page {meta.page} of {meta.totalPages} ({meta.total} bookings total)
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

      {/* Reschedule & Cancel Modals */}
      <RescheduleModal
        booking={selectedBookingForReschedule}
        isOpen={!!selectedBookingForReschedule}
        onClose={() => {
          setSelectedBookingForReschedule(null);
          refetch();
        }}
      />

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
