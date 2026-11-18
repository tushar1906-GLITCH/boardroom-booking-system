import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  Building,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { usersApi } from '../../api/users.api';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole } from '../../api/types';
import { toast } from 'sonner';

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, page],
    queryFn: () =>
      usersApi.getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        page,
        pageSize: 15,
      }),
  });

  const users = usersResponse?.data || [];
  const meta = usersResponse?.meta;

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { role?: string; isActive?: boolean } }) =>
      usersApi.updateUser(id, payload),
    onSuccess: (updated) => {
      toast.success(`User ${updated.fullName} updated successfully.`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      toast.error('Update failed', {
        description: err.response?.data?.message || err.message,
      });
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          User & Access Control
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage corporate user accounts, elevate administrative privileges, and toggle activation status
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-surface-100 border border-border grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            placeholder="Search users by name, email, or department..."
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
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-surface-200 border border-border text-xs text-slate-200 focus:outline-none focus:border-primary font-mono"
          >
            <option value="">All Roles</option>
            <option value="EMPLOYEE">Employees Only</option>
            <option value="ADMIN">Admins Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-surface-100 border border-border overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-200/80 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <th className="p-4">User</th>
                <th className="p-4">Department</th>
                <th className="p-4">System Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;

                return (
                  <tr key={u.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-light font-bold text-xs border border-primary/30 shrink-0">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{u.fullName}</span>
                            {isSelf && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/20 text-primary-light border border-primary/30">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        {u.department || 'General'}
                      </div>
                    </td>

                    <td className="p-4">
                      {isSelf ? (
                        <span className="px-2.5 py-1 rounded-full font-mono text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          ADMIN
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) =>
                            updateUserMutation.mutate({
                              id: u.id,
                              payload: { role: e.target.value },
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-surface-200 border border-border text-[11px] font-mono font-bold text-slate-200 focus:outline-none focus:border-primary"
                        >
                          <option value="EMPLOYEE">EMPLOYEE</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border inline-flex items-center gap-1.5 ${
                          u.isActive
                            ? 'bg-teal/15 text-teal border-teal/30'
                            : 'bg-red-500/15 text-red-300 border-red-500/30'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.isActive ? 'bg-teal' : 'bg-red-400'
                          }`}
                        />
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      {isSelf ? (
                        <span className="text-[10px] text-slate-500 font-mono italic">
                          Protected (Self)
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            updateUserMutation.mutate({
                              id: u.id,
                              payload: { isActive: !u.isActive },
                            })
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                            u.isActive
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-teal/15 hover:bg-teal/25 text-teal border-teal/30'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Page {meta.page} of {meta.totalPages} ({meta.total} users)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-surface-200 border border-border disabled:opacity-40 text-slate-200"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-surface-200 border border-border disabled:opacity-40 text-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
