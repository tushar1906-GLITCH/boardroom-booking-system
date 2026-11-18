import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DoorOpen,
  CalendarCheck,
  TrendingUp,
  Percent,
  Clock,
  Flame,
  Award,
  Layers,
  BarChart3,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { statsApi } from '../../api/stats.api';

export const AdminDashboardPage: React.FC = () => {
  const [trendDays, setTrendDays] = useState(30);

  // 1. Overview KPIs
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['admin-stats-overview'],
    queryFn: () => statsApi.getOverview(),
  });

  // 2. Bookings per day trend
  const { data: trends } = useQuery({
    queryKey: ['admin-stats-trends', trendDays],
    queryFn: () => statsApi.getBookingsPerDay(trendDays),
  });

  // 3. Room utilization
  const { data: utilization } = useQuery({
    queryKey: ['admin-stats-utilization'],
    queryFn: () => statsApi.getRoomUtilization(),
  });

  // 4. Peak hours heatmap data
  const { data: peakHours } = useQuery({
    queryKey: ['admin-stats-peak'],
    queryFn: () => statsApi.getPeakHours(),
  });

  // 5. Top rooms
  const { data: topRooms } = useQuery({
    queryKey: ['admin-stats-top-rooms'],
    queryFn: () => statsApi.getTopRooms(),
  });

  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const hoursList = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  // Helper to color heatmap cells based on count
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-surface-200/50 text-slate-600';
    if (count === 1) return 'bg-primary/20 text-primary-light font-bold';
    if (count === 2) return 'bg-primary/40 text-white font-bold';
    return 'bg-primary text-white font-extrabold shadow-sm';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Enterprise Analytics & Utilization
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Live company-wide telemetry, room demand curves, and space efficiency metrics
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-medium uppercase">Active Rooms</span>
            <DoorOpen className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-2">
            {overview?.totalRooms ?? 0}
          </p>
          <span className="text-[10px] text-teal mt-1 block">In Active Inventory</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-medium uppercase">Bookings Today</span>
            <CalendarCheck className="w-4 h-4 text-teal" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-2">
            {overview?.bookingsToday ?? 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Confirmed Today</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-medium uppercase">Upcoming</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-2">
            {overview?.upcomingBookings ?? 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Future Confirmed</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-medium uppercase">30-Day Volume</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-2">
            {overview?.totalBookingsLast30Days ?? 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Total Bookings</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-medium uppercase">Cancellation Rate</span>
            <Percent className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-2">
            {overview?.cancellationRate ?? 0}%
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {overview?.cancelledBookingsLast30Days ?? 0} released
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-medium uppercase">Avg Utilization</span>
            <TrendingUp className="w-4 h-4 text-teal" />
          </div>
          <p className="text-2xl font-bold font-mono text-teal mt-2">
            {overview?.averageRoomUtilization ?? 0}%
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Of business hours</span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Volume Trend Chart */}
        <div className="p-6 rounded-2xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Booking Volume Trend (Last 30 Days)
              </h3>
              <p className="text-xs text-slate-400">Confirmed vs Cancelled reservations</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-primary-light">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Confirmed
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Cancelled
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConfirmed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C6CFF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7C6CFF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(val) => val.slice(5)}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151B2A',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="confirmed"
                  stroke="#7C6CFF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorConfirmed)"
                />
                <Area
                  type="monotone"
                  dataKey="cancelled"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCancelled)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Room Utilization Bar Chart */}
        <div className="p-6 rounded-2xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Room Utilization Rate (%)
              </h3>
              <p className="text-xs text-slate-400">Percentage of business hours booked</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-500" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={utilization || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="roomName"
                  tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(val) => val.split(' ')[0]}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  unit="%"
                  tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151B2A',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono',
                  }}
                  formatter={(value: any) => [`${value}%`, 'Utilization']}
                />
                <Bar dataKey="utilizationPercentage" radius={[6, 6, 0, 0]}>
                  {(utilization || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.accentColor || '#7C6CFF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heatmap & Top Rooms Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Peak Hours Heatmap (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Peak Booking Demand Heatmap
              </h3>
              <p className="text-xs text-slate-400">Meeting density across weekdays and office hours</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span>Less</span>
              <span className="w-3 h-3 rounded bg-surface-200 border border-border" />
              <span className="w-3 h-3 rounded bg-primary/20" />
              <span className="w-3 h-3 rounded bg-primary/40" />
              <span className="w-3 h-3 rounded bg-primary" />
              <span>More</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              {/* Hour Header */}
              <div className="grid grid-cols-13 gap-1.5 mb-1.5 text-center">
                <div className="text-[10px] font-mono text-slate-500 text-left">Day</div>
                {hoursList.map((h) => (
                  <div key={h} className="text-[10px] font-mono text-slate-500">
                    {h}:00
                  </div>
                ))}
              </div>

              {/* Day Rows */}
              {weekdayNames.map((dayName, dayIndex) => {
                const dayNum = dayIndex + 1;
                return (
                  <div key={dayName} className="grid grid-cols-13 gap-1.5 mb-1.5 items-center">
                    <span className="text-[11px] font-mono text-slate-400 font-semibold">{dayName}</span>
                    {hoursList.map((hour) => {
                      const item = (peakHours || []).find((p) => p.day === dayNum && p.hour === hour);
                      const count = item ? item.count : 0;
                      return (
                        <div
                          key={`${dayNum}-${hour}`}
                          className={`h-7 rounded-lg flex items-center justify-center text-[11px] font-mono transition-transform hover:scale-110 cursor-default ${getHeatmapColor(
                            count,
                          )}`}
                          title={`${dayName} at ${hour}:00 - ${count} booking(s)`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Rooms Leaderboard */}
        <div className="p-6 rounded-2xl bg-surface-100 border border-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-primary-light" />
              Top Booked Rooms
            </h3>
            <p className="text-xs text-slate-400 mb-4">Highest utilization over 30 days</p>

            <div className="space-y-3">
              {(topRooms || []).map((room, idx) => (
                <div
                  key={room.roomId}
                  className="p-3 rounded-xl bg-surface-200 border border-border/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-500 w-4">
                      #{idx + 1}
                    </span>
                    <div
                      className="w-2.5 h-8 rounded-full"
                      style={{ backgroundColor: room.accentColor || '#7C6CFF' }}
                    />
                    <div>
                      <p className="text-xs font-bold text-white truncate max-w-[120px]">
                        {room.roomName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {room.totalHours} hrs booked
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-primary-light">
                      {room.totalBookings}
                    </span>
                    <span className="text-[10px] text-slate-500 block">meetings</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-4 text-center">
            <span className="text-xs font-mono text-slate-400">
              All metrics update in real-time
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
