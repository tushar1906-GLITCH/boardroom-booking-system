import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  Users,
  MapPin,
  CheckCircle2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { roomsApi } from '../../api/rooms.api';
import { Room, RoomStatus } from '../../api/types';

const roomFormSchema = z.object({
  name: z.string().min(2, 'Room name is required').max(100),
  floorOrLocation: z.string().min(2, 'Location is required').max(100),
  capacity: z.coerce.number().min(1).max(500),
  description: z.string().max(500).optional(),
  amenities: z.string().optional(), // Comma-separated
  status: z.enum(['ACTIVE', 'MAINTENANCE']),
  accentColor: z.string().min(4).max(10),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;

export const AdminRoomsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Delete modal state
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [futureBookingsWarning, setFutureBookingsWarning] = useState<number | null>(null);

  const { data: roomsResponse, isLoading } = useQuery({
    queryKey: ['admin-rooms', search],
    queryFn: () => roomsApi.getRooms({ search: search || undefined, pageSize: 50 }),
  });

  const rooms = roomsResponse?.data || [];

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: '',
      floorOrLocation: '',
      capacity: 8,
      description: '',
      amenities: 'Whiteboard, TV Screen',
      status: 'ACTIVE',
      accentColor: '#7C6CFF',
    },
  });

  const openCreateModal = () => {
    setEditingRoom(null);
    reset({
      name: '',
      floorOrLocation: '',
      capacity: 8,
      description: '',
      amenities: 'Whiteboard, TV Screen',
      status: 'ACTIVE',
      accentColor: '#7C6CFF',
    });
    setModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setValue('name', room.name);
    setValue('floorOrLocation', room.floorOrLocation);
    setValue('capacity', room.capacity);
    setValue('description', room.description || '');
    setValue('amenities', room.amenities?.join(', ') || '');
    setValue('status', room.status);
    setValue('accentColor', room.accentColor);
    setModalOpen(true);
  };

  // Save (Create or Update) Mutation
  const saveMutation = useMutation({
    mutationFn: async (values: RoomFormValues) => {
      const payload = {
        name: values.name,
        floorOrLocation: values.floorOrLocation,
        capacity: values.capacity,
        description: values.description || undefined,
        amenities: values.amenities
          ? values.amenities.split(',').map((a) => a.trim()).filter(Boolean)
          : [],
        status: values.status as RoomStatus,
        accentColor: values.accentColor,
      };

      if (editingRoom) {
        return roomsApi.updateRoom(editingRoom.id, payload);
      } else {
        return roomsApi.createRoom(payload);
      }
    },
    onSuccess: () => {
      toast.success(editingRoom ? 'Room updated successfully!' : 'Room created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-all-active'] });
      setModalOpen(false);
    },
    onError: (err: any) => {
      toast.error('Failed to save room', {
        description: err.response?.data?.message || err.message,
      });
    },
  });

  // Toggle Maintenance Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (room: Room) => {
      const nextStatus = room.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
      return roomsApi.updateRoom(room.id, { status: nextStatus });
    },
    onSuccess: (updated) => {
      toast.success(`Room status changed to ${updated.status}.`);
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-catalog'] });
    },
  });

  // Delete Room Mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, cancelFuture }: { id: string; cancelFuture?: boolean }) =>
      roomsApi.deleteRoom(id, cancelFuture),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-catalog'] });
      setRoomToDelete(null);
      setFutureBookingsWarning(null);
    },
    onError: (err: any) => {
      const futureCount = err.response?.data?.futureBookingsCount;
      if (futureCount) {
        setFutureBookingsWarning(futureCount);
      } else {
        toast.error('Failed to delete room', {
          description: err.response?.data?.message || err.message,
        });
      }
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Room Inventory Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create, configure specifications, set maintenance status, or decommission meeting rooms
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow self-start sm:self-auto transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Room</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3.5 rounded-xl bg-surface-100 border border-border flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search rooms by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 rounded-xl bg-surface-200 border border-border text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Rooms Table */}
      <div className="rounded-2xl bg-surface-100 border border-border overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-200/80 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <th className="p-4">Room Details</th>
                <th className="p-4">Location</th>
                <th className="p-4">Capacity</th>
                <th className="p-4">Amenities</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-surface-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: room.accentColor || '#7C6CFF' }}
                      />
                      <div>
                        <span className="font-bold text-white text-sm block">{room.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Color: {room.accentColor}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 text-slate-300 font-medium">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {room.floorOrLocation}
                    </div>
                  </td>

                  <td className="p-4 font-mono font-bold text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {room.capacity}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {room.amenities.map((a) => (
                        <span
                          key={a}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-surface-200 text-slate-300 border border-border font-medium"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border inline-flex items-center gap-1.5 ${
                        room.status === 'ACTIVE'
                          ? 'bg-teal/15 text-teal border-teal/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          room.status === 'ACTIVE' ? 'bg-teal' : 'bg-amber-400'
                        }`}
                      />
                      {room.status}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => toggleStatusMutation.mutate(room)}
                        title={
                          room.status === 'ACTIVE'
                            ? 'Put room in maintenance'
                            : 'Set room to active'
                        }
                        className={`p-1.5 rounded-lg border transition-colors ${
                          room.status === 'ACTIVE'
                            ? 'bg-surface-200 text-amber-400 hover:bg-amber-500/20 border-border'
                            : 'bg-teal/20 text-teal hover:bg-teal/30 border-teal/40'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => openEditModal(room)}
                        className="p-1.5 rounded-lg bg-surface-200 text-slate-300 hover:text-white hover:bg-surface-50 border border-border transition-colors"
                        title="Edit Room"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setRoomToDelete(room);
                          setFutureBookingsWarning(null);
                        }}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                        title="Delete Room"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Room Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-surface-100 border border-border rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-200">
              <h3 className="text-base font-bold text-white tracking-tight">
                {editingRoom ? `Edit Room: ${editingRoom.name}` : 'Create New Meeting Room'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                  Room Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alan Turing Collaboration Suite"
                  {...register('name')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-white focus:outline-none focus:border-primary"
                />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                    Location / Floor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2nd Floor, East Wing"
                    {...register('floorOrLocation')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-white focus:outline-none focus:border-primary"
                  />
                  {errors.floorOrLocation && (
                    <p className="text-xs text-red-400 mt-1">{errors.floorOrLocation.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                    Capacity (1 - 500)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    {...register('capacity')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-white focus:outline-none focus:border-primary font-mono"
                  />
                  {errors.capacity && (
                    <p className="text-xs text-red-400 mt-1">{errors.capacity.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                    Status
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                    Accent Color (Hex)
                  </label>
                  <input
                    type="text"
                    placeholder="#7C6CFF"
                    {...register('accentColor')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-white focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                  Amenities (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Whiteboard, Projector, Video Conferencing, Phone"
                  {...register('amenities')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                  Room Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Features, acoustic treatment, or equipment details..."
                  {...register('description')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-white focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : editingRoom ? 'Update Room' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal with Future Booking Notification Warning */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-surface-100 border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Decommission Room?</h3>
                <p className="text-xs text-slate-400">{roomToDelete.name}</p>
              </div>
            </div>

            {futureBookingsWarning ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1.5">
                <p className="font-bold">Active Reservations Detected:</p>
                <p>
                  This room has <strong>{futureBookingsWarning}</strong> confirmed future booking(s).
                  Deleting this room will cancel those bookings and automatically notify all meeting organizers.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-300">
                Are you sure you want to soft-delete this room? Historical booking records will be preserved.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteMutation.mutate({
                    id: roomToDelete.id,
                    cancelFuture: futureBookingsWarning ? true : false,
                  })
                }
                disabled={deleteMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {deleteMutation.isPending
                  ? 'Deleting...'
                  : futureBookingsWarning
                  ? 'Confirm & Cancel Bookings'
                  : 'Delete Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
