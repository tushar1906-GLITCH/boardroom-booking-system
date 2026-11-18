import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, Clock, Users, AlertCircle, CheckCircle2, Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBookingModal } from '../../context/BookingModalContext';
import { roomsApi } from '../../api/rooms.api';
import { bookingsApi } from '../../api/bookings.api';
import { Room } from '../../api/types';

// Zod schema for client-side validation
const bookingSchema = z.object({
  roomId: z.string().uuid('Please select a valid meeting room'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(120, 'Title cannot exceed 120 characters'),
  description: z.string().max(500, 'Description max 500 characters').optional(),
  date: z.string().min(1, 'Please select a meeting date'),
  startTime: z.string().min(1, 'Please select a start time'),
  endTime: z.string().min(1, 'Please select an end time'),
  attendeeCount: z.coerce.number().min(1, 'Must have at least 1 attendee'),
  reminderMinutesBefore: z.coerce.number(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

// Business hours 30-minute intervals
const START_TIMES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
];

const END_TIMES = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
  '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
];

export const BookingModal: React.FC = () => {
  const { isOpen, initialData, closeBookingModal } = useBookingModal();
  const queryClient = useQueryClient();
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // Today formatted as YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      roomId: '',
      title: '',
      description: '',
      date: todayStr,
      startTime: '10:00',
      endTime: '11:00',
      attendeeCount: 2,
      reminderMinutesBefore: 15,
    },
  });

  const selectedRoomId = watch('roomId');
  const selectedDate = watch('date');
  const selectedStartTime = watch('startTime');
  const selectedEndTime = watch('endTime');
  const attendeeCount = watch('attendeeCount');

  // Load all rooms for dropdown
  const { data: roomsData } = useQuery({
    queryKey: ['rooms-all-active'],
    queryFn: () => roomsApi.getRooms({ status: 'ACTIVE', pageSize: 50 }),
    enabled: isOpen,
  });

  const activeRooms = roomsData?.data || [];
  const currentRoom = activeRooms.find((r) => r.id === selectedRoomId);

  // Fetch real-time availability for the selected room and date
  const { data: availabilityData, refetch: refetchAvailability } = useQuery({
    queryKey: ['room-availability', selectedRoomId, selectedDate],
    queryFn: () => roomsApi.getRoomAvailability(selectedRoomId, selectedDate),
    enabled: !!selectedRoomId && !!selectedDate && isOpen,
  });

  // Pre-fill initial data when opened
  useEffect(() => {
    if (isOpen) {
      setConflictMessage(null);
      if (initialData?.roomId) setValue('roomId', initialData.roomId);
      if (initialData?.date) setValue('date', initialData.date);
      if (initialData?.startTime) setValue('startTime', initialData.startTime);
      if (initialData?.endTime) setValue('endTime', initialData.endTime);
    }
  }, [isOpen, initialData, setValue]);

  // If no room is selected yet and rooms load, default to the first room
  useEffect(() => {
    if (isOpen && !selectedRoomId && activeRooms.length > 0) {
      setValue('roomId', activeRooms[0].id);
    }
  }, [isOpen, selectedRoomId, activeRooms, setValue]);

  // Mutation to create booking
  const createMutation = useMutation({
    mutationFn: (payload: any) => bookingsApi.createBooking(payload),
    onSuccess: (booking) => {
      toast.success('Meeting scheduled successfully!', {
        description: `Reserved ${booking.title} in ${booking.room?.name || 'room'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      closeBookingModal();
      reset();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to create booking';
      setConflictMessage(msg);
      refetchAvailability();
      toast.error('Booking conflict or validation error', { description: msg });
    },
  });

  if (!isOpen) return null;

  const onSubmit = (values: BookingFormValues) => {
    setConflictMessage(null);

    // Validate duration: end must be after start
    if (values.endTime <= values.startTime) {
      setConflictMessage('End time must be strictly after start time.');
      return;
    }

    // Capacity validation
    if (currentRoom && values.attendeeCount > currentRoom.capacity) {
      setConflictMessage(
        `Attendee count (${values.attendeeCount}) exceeds maximum capacity of ${currentRoom.name} (${currentRoom.capacity}).`,
      );
      return;
    }

    // Combine date and time into ISO timestamp
    const startIso = new Date(`${values.date}T${values.startTime}:00`).toISOString();
    const endIso = new Date(`${values.date}T${values.endTime}:00`).toISOString();

    createMutation.mutate({
      roomId: values.roomId,
      title: values.title,
      description: values.description || undefined,
      attendeeCount: values.attendeeCount,
      startTime: startIso,
      endTime: endIso,
      reminderMinutesBefore: Number(values.reminderMinutesBefore),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-surface-100 border border-border rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary-light border border-primary/30">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Schedule Meeting Room</h2>
              <p className="text-xs text-slate-400">Reserve a guaranteed slot with instant conflict check</p>
            </div>
          </div>
          <button
            onClick={closeBookingModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Alert Banner */}
        {conflictMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 flex items-start gap-2.5 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-red-300">Conflict / Error:</span>
              {conflictMessage}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Room Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
              Meeting Room <span className="text-primary">*</span>
            </label>
            <select
              {...register('roomId')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 focus:outline-none focus:border-primary transition-colors"
            >
              {activeRooms.map((room) => (
                <option key={room.id} value={room.id} className="bg-surface-200 text-white">
                  {room.name} ({room.floorOrLocation}) — Capacity: {room.capacity}
                </option>
              ))}
            </select>
            {errors.roomId && <p className="text-xs text-red-400 mt-1">{errors.roomId.message}</p>}
          </div>

          {/* Meeting Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
              Meeting Title <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Q4 Sprint Planning & Alignment"
              {...register('title')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
            />
            {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
          </div>

          {/* Date & Attendees Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Date <span className="text-primary">*</span>
              </label>
              <input
                type="date"
                {...register('date')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 focus:outline-none focus:border-primary transition-colors"
              />
              {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Attendees</span>
                {currentRoom && (
                  <span className="text-[10px] text-slate-400 normal-case font-mono">
                    Max: {currentRoom.capacity}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={currentRoom ? currentRoom.capacity : 500}
                  {...register('attendeeCount')}
                  className="w-full px-3.5 py-2.5 pl-9 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 focus:outline-none focus:border-primary transition-colors font-mono"
                />
                <Users className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
              {errors.attendeeCount && (
                <p className="text-xs text-red-400 mt-1">{errors.attendeeCount.message}</p>
              )}
            </div>
          </div>

          {/* Time Slot (30m Grid) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Start Time <span className="text-primary">*</span>
              </label>
              <select
                {...register('startTime')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 focus:outline-none focus:border-primary transition-colors font-mono"
              >
                {START_TIMES.map((time) => (
                  <option key={time} value={time} className="bg-surface-200 text-white">
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                End Time <span className="text-primary">*</span>
              </label>
              <select
                {...register('endTime')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 focus:outline-none focus:border-primary transition-colors font-mono"
              >
                {END_TIMES.filter((t) => t > selectedStartTime).map((time) => (
                  <option key={time} value={time} className="bg-surface-200 text-white">
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Availability Preview Pills */}
          {availabilityData && (
            <div className="p-3 rounded-xl bg-surface-200/80 border border-border/60">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-2">
                Occupied Slots Today ({availabilityData.busySlots.length}):
              </span>
              {availabilityData.busySlots.length === 0 ? (
                <p className="text-xs text-teal flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  All business hours (08:00 - 20:00) currently available!
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {availabilityData.busySlots.map((b) => (
                    <span
                      key={b.id}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20"
                      title={`${b.title} (${b.organizer})`}
                    >
                      {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reminder Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-primary" />
              Automated Meeting Reminder
            </label>
            <select
              {...register('reminderMinutesBefore')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 focus:outline-none focus:border-primary transition-colors"
            >
              <option value="15">15 minutes before meeting (Standard)</option>
              <option value="10">10 minutes before meeting</option>
              <option value="30">30 minutes before meeting</option>
              <option value="60">1 hour before meeting</option>
              <option value="0">No reminder</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
              Meeting Notes / Agenda (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Outline discussion items or requirements..."
              {...register('description')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={closeBookingModal}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-surface-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold shadow-glow transition-all active:scale-95"
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Reserving Slot...</span>
                </>
              ) : (
                <span>Confirm Reservation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
