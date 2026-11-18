import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bookingsApi } from '../../api/bookings.api';
import { Booking } from '../../api/types';

interface CancelConfirmModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CancelConfirmModal: React.FC<CancelConfirmModalProps> = ({
  booking,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancelBooking(booking!.id, reason || undefined),
    onSuccess: () => {
      toast.success('Meeting reservation cancelled.', {
        description: 'The time slot has been immediately released for other employees.',
      });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setReason('');
      onClose();
    },
    onError: (err: any) => {
      toast.error('Failed to cancel booking', {
        description: err.response?.data?.message || err.message,
      });
    },
  });

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-surface-100 border border-border rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Cancel Reservation</h2>
              <p className="text-xs text-slate-400">Release room back to company inventory</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-surface-200/80 border border-border">
            <p className="text-xs font-semibold text-white">{booking.title}</p>
            <p className="text-xs text-slate-400 mt-1">
              {booking.room?.name} • {new Date(booking.startTime).toLocaleDateString()} (
              {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
              {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
              Cancellation Reason (Optional)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Moved to remote call or client postponed..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-red-400 transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white"
            >
              Keep Booking
            </button>
            <button
              type="button"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
