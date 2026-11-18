import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  DoorOpen,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBookingModal } from '../../context/BookingModalContext';
import { statsApi } from '../../api/stats.api';
import { roomsApi } from '../../api/rooms.api';
import { bookingsApi } from '../../api/bookings.api';
import { RescheduleModal } from '../../components/bookings/RescheduleModal';
import { CancelConfirmModal } from '../../components/bookings/CancelConfirmModal';
import { Booking } from '../../api/types';
import { Link } from 'react-router-dom';

export const EmployeeDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { openBookingModal } = useBookingModal();

  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<Booking | null>(null);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [countdownText, setCountdownText] = useState<string>('');

  // 1. Fetch personal employee stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['employee-stats-me'],
    queryFn: () => statsApi.getMeStats(),
  });

  // 2. Fetch available rooms right now
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms-available-now'],
    queryFn: () => roomsApi.getRooms({ status: 'ACTIVE', pageSize: 6 }),
  });

  // 3. Fetch my upcoming bookings for today
  const todayIso = new Date().toISOString().split('T')[0];
  const { data: myBookingsData } = useQuery({
    queryKey: ['my-upcoming-today'],
    queryFn: () =>
      bookingsApi.getMyBookings({
        scope: 'upcoming',
        from: `${todayIso}T00:00:00.000Z`,
        to: `${todayIso}T23:59:59.999Z`,
        pageSize: 5,
      }),
  });

  // Countdown timer for next meeting
  useEffect(() => {
    if (!statsData?.nextMeeting) {
      setCountdownText('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(statsData.nextMeeting!.startTime).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdownText('Meeting in progress now');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setCountdownText(`in ${days} day(s)`);
      } else if (hours > 0) {
        setCountdownText(`in ${hours}h ${minutes}m`);
      } else {
        setCountdownText(`in ${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [statsData?.nextMeeting]);

  const availableRooms = roomsData?.data?.filter((r) => r.isAvailableNow) || [];
  const todayBookings = myBookingsData?.data || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Welcome back, {user?.fullName.split(' ')[0]} 👋
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })} • Asia/Kolkata Business Hours (08:00 - 20:00)
          </p>
        </div>

        <button
          onClick={() => openBookingModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow self-start sm:self-auto transition-transform active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>Quick Book Slot</span>
        </button>
      </div>

      {/* Hero Strip: Next Meeting & Quick Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Next Meeting Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-surface-100 border border-border p-6 shadow-card">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono tracking-wider text-primary-light uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Next Scheduled Meeting
              </span>
              {countdownText && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-primary/20 text-primary-light border border-primary/30 animate-pulse">
                  {countdownText}
                </span>
              )}
            </div>

            {statsData?.nextMeeting ? (
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {statsData.nextMeeting.title}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <DoorOpen className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-200">
                      {statsData.nextMeeting.roomName}
                    </span>
                    <span className="text-slate-500">({statsData.nextMeeting.floorOrLocation})</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>
                      {new Date(statsData.nextMeeting.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(statsData.nextMeeting.endTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{statsData.nextMeeting.attendeeCount} Attendees</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-teal/80 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-200">No upcoming meetings today</p>
                <p className="text-xs text-slate-400 mt-1">Your schedule is currently clear. Reserve a room when ready.</p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-border/60">
              <Link
                to="/my-bookings"
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                View all my bookings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Personal Stat Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          <div className="p-4 rounded-xl bg-surface-100 border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-medium text-slate-400 uppercase">Bookings This Week</p>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {statsData?.bookingsThisWeek ?? 0}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary-light border border-primary/20">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-100 border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-medium text-slate-400 uppercase">Hours Booked (This Month)</p>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {statsData?.hoursBookedThisMonth ?? 0} <span className="text-xs font-normal text-slate-400">hrs</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center text-teal border border-teal/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Available Right Now Strip */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal animate-pulse" />
            Available Right Now ({availableRooms.length})
          </h3>
          <Link to="/rooms" className="text-xs text-primary-light hover:underline font-medium">
            Browse all rooms →
          </Link>
        </div>

        {availableRooms.length === 0 ? (
          <div className="p-6 rounded-2xl bg-surface-100 border border-border text-center text-xs text-slate-400">
            All rooms are currently in use. Check back later or book for an upcoming slot.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableRooms.slice(0, 3).map((room) => (
              <div
                key={room.id}
                className="p-4 rounded-xl bg-surface-100 border border-border hover:border-teal/50 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/30 font-medium">
                      Available Now
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {room.capacity}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-2 group-hover:text-primary-light transition-colors">
                    {room.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{room.floorOrLocation}</p>
                </div>

                <button
                  onClick={() => openBookingModal({ roomId: room.id })}
                  className="mt-4 w-full py-1.5 rounded-lg bg-surface-50 hover:bg-primary hover:text-white text-xs font-semibold text-slate-300 border border-border transition-all"
                >
                  Book Instant Slot
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's Meetings Timeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">
            Today's Schedule ({todayBookings.length})
          </h3>
          <Link to="/calendar" className="text-xs text-primary-light hover:underline font-medium">
            Open calendar view →
          </Link>
        </div>

        {todayBookings.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface-100 border border-border text-center">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No more meetings today</p>
            <p className="text-xs text-slate-500 mt-1">Enjoy your uninterrupted focus time!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayBookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-surface-100 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-2 h-10 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: b.room?.accentColor || '#7C6CFF' }}
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white">{b.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {b.room?.name} • {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setSelectedBookingForReschedule(b)}
                    className="px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-surface-200 text-xs text-slate-300 border border-border transition-colors"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => setSelectedBookingForCancel(b)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs text-red-300 border border-red-500/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <RescheduleModal
        booking={selectedBookingForReschedule}
        isOpen={!!selectedBookingForReschedule}
        onClose={() => setSelectedBookingForReschedule(null)}
      />

      <CancelConfirmModal
        booking={selectedBookingForCancel}
        isOpen={!!selectedBookingForCancel}
        onClose={() => setSelectedBookingForCancel(null)}
      />
    </div>
  );
};
