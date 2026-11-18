import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  Filter,
  Users,
  MapPin,
  Clock,
  X,
  Plus,
} from 'lucide-react';
import { bookingsApi, CalendarEventItem } from '../../api/bookings.api';
import { roomsApi } from '../../api/rooms.api';
import { useBookingModal } from '../../context/BookingModalContext';
import { useAuth } from '../../context/AuthContext';
import { RescheduleModal } from '../../components/bookings/RescheduleModal';
import { CancelConfirmModal } from '../../components/bookings/CancelConfirmModal';
import { Booking } from '../../api/types';

export const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const { openBookingModal } = useBookingModal();
  const calendarRef = useRef<FullCalendar>(null);

  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
  });

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);

  // Modals for selected event actions
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);

  // Fetch all active rooms for legend/filter
  const { data: roomsData } = useQuery({
    queryKey: ['rooms-all-active'],
    queryFn: () => roomsApi.getRooms({ status: 'ACTIVE', pageSize: 50 }),
  });
  const rooms = roomsData?.data || [];

  // Fetch calendar events
  const roomFilterString = selectedRoomIds.length > 0 ? selectedRoomIds.join(',') : undefined;
  const { data: events, refetch } = useQuery({
    queryKey: ['calendar-events', dateRange.from, dateRange.to, roomFilterString],
    queryFn: () =>
      bookingsApi.getCalendarEvents(dateRange.from, dateRange.to, roomFilterString),
    refetchInterval: 60000,
  });

  const toggleRoomFilter = (roomId: string) => {
    if (selectedRoomIds.includes(roomId)) {
      setSelectedRoomIds(selectedRoomIds.filter((id) => id !== roomId));
    } else {
      setSelectedRoomIds([...selectedRoomIds, roomId]);
    }
  };

  const handleDatesSet = (arg: any) => {
    setDateRange({
      from: arg.start.toISOString(),
      to: arg.end.toISOString(),
    });
  };

  const handleEventClick = (clickInfo: any) => {
    const eventObj = clickInfo.event;
    setSelectedEvent({
      id: eventObj.id,
      title: eventObj.title,
      start: eventObj.startStr,
      end: eventObj.endStr,
      backgroundColor: eventObj.backgroundColor,
      borderColor: eventObj.borderColor,
      textColor: eventObj.textColor,
      extendedProps: eventObj.extendedProps,
    });
  };

  const handleDateClick = (arg: any) => {
    // Open booking modal with prefilled date and time
    const clickedDate = arg.date;
    const dateStr = clickedDate.toISOString().split('T')[0];
    const hour = clickedDate.getHours().toString().padStart(2, '0');
    const min = clickedDate.getMinutes() < 30 ? '00' : '30';
    const startTime = `${hour}:${min}`;

    openBookingModal({
      date: dateStr,
      startTime,
      endTime: `${(parseInt(hour, 10) + 1).toString().padStart(2, '0')}:${min}`,
    });
  };

  // Convert event to Booking shape for modals
  const handleOpenReschedule = async () => {
    if (!selectedEvent) return;
    try {
      const b = await bookingsApi.getBookingById(selectedEvent.id);
      setSelectedEvent(null);
      setRescheduleBooking(b);
    } catch (e) {
      //
    }
  };

  const handleOpenCancel = async () => {
    if (!selectedEvent) return;
    try {
      const b = await bookingsApi.getBookingById(selectedEvent.id);
      setSelectedEvent(null);
      setCancelBooking(b);
    } catch (e) {
      //
    }
  };

  const isOwnerOrAdmin =
    selectedEvent &&
    (user?.role === 'ADMIN' || selectedEvent.extendedProps.organizerId === user?.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Company Calendar
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time schedule of all meeting rooms. Click any open slot to reserve immediately.
          </p>
        </div>

        <button
          onClick={() => openBookingModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow self-start sm:self-auto transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Room Legend & Filter Strip */}
      <div className="p-4 rounded-2xl bg-surface-100 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-primary" />
            Filter by Room:
          </span>
          {selectedRoomIds.length > 0 && (
            <button
              onClick={() => setSelectedRoomIds([])}
              className="text-[11px] font-mono text-primary-light hover:underline"
            >
              Reset to all rooms
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {rooms.map((room) => {
            const isSelected = selectedRoomIds.includes(room.id);
            return (
              <button
                key={room.id}
                onClick={() => toggleRoomFilter(room.id)}
                className={`text-xs px-2.5 py-1.5 rounded-xl border flex items-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-surface-200 text-white border-white/30 font-bold shadow-sm'
                    : 'bg-surface-200/60 text-slate-400 border-border hover:text-slate-200'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: room.accentColor || '#7C6CFF' }}
                />
                <span>{room.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FullCalendar Wrapper */}
      <div className="p-4 sm:p-6 rounded-2xl bg-surface-100 border border-border shadow-card overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          datesSet={handleDatesSet}
          events={events || []}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          selectable={true}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '08:00',
            endTime: '20:00',
          }}
          allDaySlot={false}
          nowIndicator={true}
          height="auto"
          expandRows={true}
          slotDuration="00:30:00"
        />
      </div>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-surface-100 border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
            {/* Strip */}
            <div
              className="h-2.5 w-full"
              style={{ backgroundColor: selectedEvent.backgroundColor }}
            />

            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-primary-light font-bold">
                    Reservation Details
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{selectedEvent.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-surface-200 border border-border space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-white">
                    {selectedEvent.extendedProps.roomName}
                  </span>
                  <span className="text-slate-500">
                    ({selectedEvent.extendedProps.roomLocation})
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-300 font-mono">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>
                    {new Date(selectedEvent.start).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(selectedEvent.end).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>
                    Organizer:{' '}
                    <strong className="text-white">
                      {selectedEvent.extendedProps.organizer}
                    </strong>
                  </span>
                </div>

                {selectedEvent.extendedProps.description && (
                  <p className="pt-2 border-t border-border/60 text-slate-400 italic">
                    "{selectedEvent.extendedProps.description}"
                  </p>
                )}
              </div>

              {/* Actions if Owner or Admin */}
              {isOwnerOrAdmin ? (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    onClick={handleOpenReschedule}
                    className="px-4 py-2 rounded-xl bg-surface-50 hover:bg-surface-200 text-xs font-semibold text-slate-300 border border-border transition-colors"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={handleOpenCancel}
                    className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-300 border border-red-500/30 transition-colors"
                  >
                    Cancel Booking
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 text-center italic">
                  Organized by another employee (Read-only)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule & Cancel Modals */}
      <RescheduleModal
        booking={rescheduleBooking}
        isOpen={!!rescheduleBooking}
        onClose={() => {
          setRescheduleBooking(null);
          refetch();
        }}
      />

      <CancelConfirmModal
        booking={cancelBooking}
        isOpen={!!cancelBooking}
        onClose={() => {
          setCancelBooking(null);
          refetch();
        }}
      />
    </div>
  );
};
