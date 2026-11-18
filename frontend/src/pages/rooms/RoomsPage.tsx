import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Users,
  MapPin,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { roomsApi } from '../../api/rooms.api';
import { RoomDetailDrawer } from './RoomDetailDrawer';
import { useBookingModal } from '../../context/BookingModalContext';
import { Room } from '../../api/types';

const ALL_AMENITIES = [
  'Projector',
  'Whiteboard',
  'Video Conferencing',
  'TV Screen',
  'Phone',
  'Accessible',
];

export const RoomsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openBookingModal } = useBookingModal();

  const [drawerRoomId, setDrawerRoomId] = useState<string | null>(null);

  // Read URL query params
  const search = searchParams.get('search') || '';
  const minCapacity = searchParams.get('minCapacity') || '';
  const amenitiesParam = searchParams.get('amenities') || '';
  const statusParam = searchParams.get('status') || '';
  const filterDate = searchParams.get('date') || '';
  const filterStart = searchParams.get('start') || '';
  const filterEnd = searchParams.get('end') || '';

  const selectedAmenities = amenitiesParam ? amenitiesParam.split(',') : [];

  // Update URL params helper
  const updateParams = (newParams: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (!v) {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    });
    setSearchParams(next);
  };

  const toggleAmenity = (amenity: string) => {
    let updated: string[];
    if (selectedAmenities.includes(amenity)) {
      updated = selectedAmenities.filter((a) => a !== amenity);
    } else {
      updated = [...selectedAmenities, amenity];
    }
    updateParams({ amenities: updated.length > 0 ? updated.join(',') : null });
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // Convert filterDate + start/end to ISO range if both set
  let availableFrom: string | undefined = undefined;
  let availableTo: string | undefined = undefined;
  if (filterDate && filterStart && filterEnd && filterEnd > filterStart) {
    availableFrom = new Date(`${filterDate}T${filterStart}:00`).toISOString();
    availableTo = new Date(`${filterDate}T${filterEnd}:00`).toISOString();
  }

  // Fetch rooms query
  const { data: roomsResponse, isLoading } = useQuery({
    queryKey: [
      'rooms-catalog',
      search,
      minCapacity,
      amenitiesParam,
      statusParam,
      availableFrom,
      availableTo,
    ],
    queryFn: () =>
      roomsApi.getRooms({
        search: search || undefined,
        minCapacity: minCapacity ? parseInt(minCapacity, 10) : undefined,
        amenities: amenitiesParam || undefined,
        status: statusParam || undefined,
        availableFrom,
        availableTo,
        pageSize: 50,
      }),
  });

  const rooms = roomsResponse?.data || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Meeting Rooms</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Discover and reserve sound-isolated pods, creative suites, and executive halls
          </p>
        </div>

        <button
          onClick={() => openBookingModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow self-start sm:self-auto transition-transform active:scale-95"
        >
          <Calendar className="w-4 h-4" />
          <span>Schedule Meeting</span>
        </button>
      </div>

      {/* Filter Bar Panel */}
      <div className="p-4 rounded-2xl bg-surface-100 border border-border space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="md:col-span-2 relative">
            <input
              type="text"
              placeholder="Search by room name, floor, or keywords..."
              value={search}
              onChange={(e) => updateParams({ search: e.target.value || null })}
              className="w-full px-4 py-2.5 pl-10 rounded-xl bg-surface-200 border border-border text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          </div>

          {/* Capacity Filter */}
          <div>
            <select
              value={minCapacity}
              onChange={(e) => updateParams({ minCapacity: e.target.value || null })}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-200 border border-border text-xs text-slate-100 focus:outline-none focus:border-primary transition-colors font-mono"
            >
              <option value="">Any Capacity</option>
              <option value="2">At least 2 people</option>
              <option value="4">At least 4 people</option>
              <option value="8">At least 8 people</option>
              <option value="12">At least 12 people</option>
              <option value="20">Large (20+ people)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusParam}
              onChange={(e) => updateParams({ status: e.target.value || null })}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-200 border border-border text-xs text-slate-100 focus:outline-none focus:border-primary transition-colors font-mono"
            >
              <option value="">All Rooms</option>
              <option value="ACTIVE">Active Only</option>
              <option value="MAINTENANCE">Maintenance Only</option>
            </select>
          </div>
        </div>

        {/* Date & Time Range Availability Filter */}
        <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-mono text-slate-400 font-bold uppercase text-[11px] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            Check Available Between:
          </span>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => updateParams({ date: e.target.value || null })}
            className="px-2.5 py-1.5 rounded-lg bg-surface-200 border border-border text-slate-200 font-mono text-xs focus:outline-none focus:border-primary"
          />

          <input
            type="time"
            step="1800"
            value={filterStart}
            onChange={(e) => updateParams({ start: e.target.value || null })}
            className="px-2.5 py-1.5 rounded-lg bg-surface-200 border border-border text-slate-200 font-mono text-xs focus:outline-none focus:border-primary"
          />

          <span className="text-slate-500 font-mono">to</span>

          <input
            type="time"
            step="1800"
            value={filterEnd}
            onChange={(e) => updateParams({ end: e.target.value || null })}
            className="px-2.5 py-1.5 rounded-lg bg-surface-200 border border-border text-slate-200 font-mono text-xs focus:outline-none focus:border-primary"
          />

          {(search || minCapacity || amenitiesParam || statusParam || filterDate) && (
            <button
              onClick={resetFilters}
              className="ml-auto text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              Reset filters
            </button>
          )}
        </div>

        {/* Amenity Chips */}
        <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase mr-1">
            Amenities:
          </span>
          {ALL_AMENITIES.map((amenity) => {
            const isSelected = selectedAmenities.includes(amenity);
            return (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary/20 text-primary-light border-primary/50 font-semibold shadow-sm'
                    : 'bg-surface-200 text-slate-400 border-border hover:text-slate-200 hover:bg-surface-50'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                {amenity}
              </button>
            );
          })}
        </div>
      </div>

      {/* Room Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-surface-100 border border-border animate-pulse" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-100 border border-border space-y-3">
          <Filter className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No rooms matched your criteria</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query, lowering capacity requirements, or removing selected amenities.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-xl bg-surface-50 text-xs font-semibold text-slate-200 border border-border hover:bg-surface-200"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => {
            const isMaintenance = room.status === 'MAINTENANCE';
            const isAvailable = room.isAvailableNow && !isMaintenance;

            return (
              <div
                key={room.id}
                className="group relative flex flex-col justify-between rounded-2xl bg-surface-100 border border-border hover:border-slate-700 transition-all duration-200 shadow-card hover:shadow-2xl overflow-hidden"
              >
                {/* Accent Color Header Strip */}
                <div
                  className="h-2 w-full transition-all group-hover:h-2.5"
                  style={{ backgroundColor: room.accentColor || '#7C6CFF' }}
                />

                <div className="p-5 space-y-4">
                  {/* Top Status & Capacity Pill */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                        isMaintenance
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : isAvailable
                          ? 'bg-teal/15 text-teal border-teal/30'
                          : 'bg-red-500/15 text-red-300 border-red-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isMaintenance ? 'bg-amber-400' : isAvailable ? 'bg-teal' : 'bg-red-400'
                        }`}
                      />
                      {isMaintenance
                        ? 'Maintenance'
                        : isAvailable
                        ? 'Available Now'
                        : room.currentBooking
                        ? `In use until ${new Date(room.currentBooking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'Occupied'}
                    </span>

                    <span className="text-xs font-mono font-medium text-slate-300 bg-surface-200 px-2 py-0.5 rounded-lg border border-border flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {room.capacity}
                    </span>
                  </div>

                  {/* Room Name & Location */}
                  <div>
                    <h3
                      onClick={() => setDrawerRoomId(room.id)}
                      className="text-base font-bold text-white group-hover:text-primary-light transition-colors cursor-pointer"
                    >
                      {room.name}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {room.floorOrLocation}
                    </p>
                  </div>

                  {/* Description preview */}
                  {room.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {room.description}
                    </p>
                  )}

                  {/* Amenities Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {room.amenities.slice(0, 3).map((a) => (
                      <span
                        key={a}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-surface-200 text-slate-300 border border-border/80"
                      >
                        {a}
                      </span>
                    ))}
                    {room.amenities.length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-200 text-slate-400 font-mono">
                        +{room.amenities.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-4 border-t border-border/70 bg-surface-200/50 flex items-center gap-2">
                  <button
                    onClick={() => setDrawerRoomId(room.id)}
                    className="flex-1 py-2 rounded-xl bg-surface-100 hover:bg-surface-50 text-xs font-semibold text-slate-300 border border-border transition-colors text-center"
                  >
                    View Details
                  </button>
                  <button
                    disabled={isMaintenance}
                    onClick={() => openBookingModal({ roomId: room.id })}
                    className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-xs font-semibold shadow-glow transition-all active:scale-95 text-center flex items-center justify-center gap-1"
                  >
                    <span>Book Room</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      <RoomDetailDrawer
        roomId={drawerRoomId}
        isOpen={!!drawerRoomId}
        onClose={() => setDrawerRoomId(null)}
      />
    </div>
  );
};
