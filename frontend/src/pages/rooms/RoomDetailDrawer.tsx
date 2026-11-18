import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { roomsApi } from '../../api/rooms.api';
import { Room } from '../../api/types';
import { useBookingModal } from '../../context/BookingModalContext';

interface RoomDetailDrawerProps {
  roomId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RoomDetailDrawer: React.FC<RoomDetailDrawerProps> = ({
  roomId,
  isOpen,
  onClose,
}) => {
  const { openBookingModal } = useBookingModal();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );

  // 1. Fetch room details
  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['room-detail', roomId],
    queryFn: () => roomsApi.getRoomById(roomId!),
    enabled: !!roomId && isOpen,
  });

  // 2. Fetch day availability timeline
  const { data: availability, isLoading: availLoading } = useQuery({
    queryKey: ['room-timeline', roomId, selectedDate],
    queryFn: () => roomsApi.getRoomAvailability(roomId!, selectedDate),
    enabled: !!roomId && !!selectedDate && isOpen,
  });

  if (!isOpen || !roomId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-surface-100 border-l border-border shadow-2xl flex flex-col">
          {/* Header */}
          <div
            className="p-6 border-b border-border relative overflow-hidden"
            style={{
              borderTop: `4px solid ${room?.accentColor || '#7C6CFF'}`,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-wider text-primary-light uppercase">
                  Room Specification
                </span>
                <h3 className="text-xl font-bold text-white mt-1">{room?.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {room?.floorOrLocation}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Specs Strip */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-200 border border-border">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Max Capacity</span>
                <p className="text-lg font-bold font-mono text-white mt-0.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  {room?.capacity} Persons
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-200 border border-border">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Current Status</span>
                <p className="text-lg font-bold font-mono text-white mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      room?.isAvailableNow ? 'bg-teal' : 'bg-red-400'
                    }`}
                  />
                  {room?.status === 'MAINTENANCE'
                    ? 'Maintenance'
                    : room?.isAvailableNow
                    ? 'Available Now'
                    : 'Occupied'}
                </p>
              </div>
            </div>

            {/* Description */}
            {room?.description && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">
                  Overview
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed bg-surface-200 p-3.5 rounded-xl border border-border">
                  {room.description}
                </p>
              </div>
            )}

            {/* Amenities */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-2">
                Available Amenities
              </h4>
              <div className="flex flex-wrap gap-2">
                {room?.amenities?.map((amenity) => (
                  <span
                    key={amenity}
                    className="text-xs px-2.5 py-1 rounded-lg bg-surface-200 text-slate-200 border border-border flex items-center gap-1.5 font-medium"
                  >
                    <Sparkles className="w-3 h-3 text-primary-light" />
                    {amenity}
                  </span>
                ))}
              </div>
            </div>

            {/* Day Timeline Section */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Day Schedule & Free Slots
                </h4>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-surface-200 border border-border text-slate-200 focus:outline-none focus:border-primary font-mono"
                />
              </div>

              {/* Busy Intervals */}
              <div className="space-y-2 mb-4">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Booked Intervals ({availability?.busySlots.length || 0}):
                </span>
                {availability?.busySlots.length === 0 ? (
                  <p className="text-xs text-teal flex items-center gap-1.5 p-2.5 rounded-xl bg-teal/10 border border-teal/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    No meetings booked for this entire business day!
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {availability?.busySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-200">{slot.title}</p>
                          <p className="text-[11px] text-slate-400">By {slot.organizer}</p>
                        </div>
                        <span className="font-mono text-red-300 font-bold">
                          {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available 30-Minute Free Slots */}
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-2">
                  Click a Free Slot to Book ({availability?.freeSlots.length || 0} Available):
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                  {availability?.freeSlots.map((slot, idx) => {
                    const startH = new Date(slot.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    });
                    const endH = new Date(slot.endTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    });

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          onClose();
                          openBookingModal({
                            roomId: room!.id,
                            date: selectedDate,
                            startTime: startH,
                            endTime: endH,
                          });
                        }}
                        className="p-2 rounded-xl bg-surface-200 hover:bg-primary/20 hover:border-primary/40 text-center border border-border transition-all active:scale-95 group"
                      >
                        <span className="text-[11px] font-mono font-bold text-slate-200 group-hover:text-primary-light block">
                          {startH}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 group-hover:text-slate-400 block">
                          to {endH}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-border bg-surface-200">
            <button
              onClick={() => {
                onClose();
                openBookingModal({ roomId: room!.id, date: selectedDate });
              }}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Schedule Custom Time in this Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
