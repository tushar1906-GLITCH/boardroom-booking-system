import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bookingsApi } from '../../api/bookings.api';
import { roomsApi } from '../../api/rooms.api';
import { Booking } from '../../api/types';

const rescheduleSchema = z.object({
  roomId: z.string().uuid(),
  date: z.string().min(1, 'Please select a date'),
  startTime: z.string().min(1, 'Please select a start time'),
  endTime: z.string().min(1, 'Please select an end time'),
});

type RescheduleFormValues = z.infer<typeof rescheduleSchema>;

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

interface RescheduleModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({ booking, isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue } = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleSchema),
  });

  const selectedStartTime = watch('startTime');

  const { data: roomsData } = useQuery({
    queryKey: ['rooms-all-active'],
    queryFn: () => roomsApi.getRooms({ status: 'ACTIVE', pageSize: 50 }),
    enabled: isOpen,
  });

  const rooms = roomsData?.data || [];

  // Pre-fill existing booking values
  useEffect(() => {
    if (booking && isOpen) {
      setErrorMessage(null);
      const bDate = new Date(booking.startTime).toISOString().split('T')[0];
      const startH = new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const endH = new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      setValue('roomId', booking.roomId);
      setValue('date', bDate);
      setValue('startTime', startH);
      setValue('endTime', endH);
    }
  }, [booking, isOpen, setValue]);

  const rescheduleMutation = useMutation({
    mutationFn: (payload: { roomId?: string; startTime: string; endTime: string }) =>
      bookingsApi.rescheduleBooking(booking!.id, payload),
    onSuccess: () => {
      toast.success('Meeting rescheduled successfully!');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to reschedule';
      setErrorMessage(msg);
      toast.error('Reschedule conflict', { description: msg });
    },
  });

  if (!isOpen || !booking) return null;

  const onSubmit = (values: RescheduleFormValues) => {
    setErrorMessage(null);
    if (values.endTime <= values.startTime) {
      setErrorMessage('End time must be after start time.');
      return;
    }

    const startIso = new Date(`${values.date}T${values.startTime}:00`).toISOString();
    const endIso = new Date(`${values.date}T${values.endTime}:00`).toISOString();

    rescheduleMutation.mutate({
      roomId: values.roomId,
      startTime: startIso,
      endTime: endIso,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-surface-100 border border-border rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary-light border border-primary/30">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Reschedule Meeting</h2>
              <p className="text-xs text-slate-400 truncate max-w-xs">{booking.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
              Room
            </label>
            <select
              {...register('roomId')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 focus:outline-none focus:border-primary"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id} className="bg-surface-200">
                  {r.name} (Cap: {r.capacity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
              Date
            </label>
            <input
              type="date"
              {...register('date')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                Start Time
              </label>
              <select
                {...register('startTime')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 focus:outline-none focus:border-primary font-mono"
              >
                {START_TIMES.map((time) => (
                  <option key={time} value={time} className="bg-surface-200">
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                End Time
              </label>
              <select
                {...register('endTime')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 focus:outline-none focus:border-primary font-mono"
              >
                {END_TIMES.filter((t) => t > selectedStartTime).map((time) => (
                  <option key={time} value={time} className="bg-surface-200">
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rescheduleMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold shadow-glow disabled:opacity-50"
            >
              {rescheduleMutation.isPending ? 'Rescheduling...' : 'Update Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
