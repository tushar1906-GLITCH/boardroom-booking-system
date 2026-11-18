import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Shield, Building, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth.api';
import { toast } from 'sonner';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(120),
  department: z.string().max(100).optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Must contain at least 1 letter and 1 number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      department: user?.department || '',
    },
  });

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onUpdateProfile = async (values: ProfileFormValues) => {
    setProfileSaving(true);
    try {
      const updated = await authApi.updateMe(values);
      updateUser(updated);
      toast.success('Profile details updated successfully.');
    } catch (err: any) {
      toast.error('Failed to update profile', {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const onChangePassword = async (values: PasswordFormValues) => {
    setPasswordSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password updated successfully!');
      resetPasswordForm();
    } catch (err: any) {
      toast.error('Password change failed', {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Account Settings</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your personal identity, corporate team association, and security credentials
        </p>
      </div>

      {/* Account Overview Card */}
      <div className="p-6 rounded-2xl bg-surface-100 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary-light font-bold text-xl border border-primary/30">
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{user?.fullName}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-surface-200 text-slate-300 border border-border">
            Role: {user?.role}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-teal/15 text-teal border border-teal/30">
            Account Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Information Form */}
        <div className="p-6 rounded-2xl bg-surface-100 border border-border space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Profile Information
            </h3>
            <p className="text-xs text-slate-400">Update your public name and department</p>
          </div>

          <form onSubmit={handleProfileSubmit(onUpdateProfile)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                Full Name
              </label>
              <input
                type="text"
                {...registerProfile('fullName')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-white focus:outline-none focus:border-primary"
              />
              {profileErrors.fullName && (
                <p className="text-xs text-red-400 mt-1">{profileErrors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                Department / Team
              </label>
              <input
                type="text"
                {...registerProfile('department')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-200 border border-border text-sm text-white focus:outline-none focus:border-primary"
              />
              {profileErrors.department && (
                <p className="text-xs text-red-400 mt-1">{profileErrors.department.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow disabled:opacity-50"
            >
              {profileSaving ? 'Saving Changes...' : 'Save Profile Details'}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="p-6 rounded-2xl bg-surface-100 border border-border space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Change Password
            </h3>
            <p className="text-xs text-slate-400">Ensure your account uses a strong passphrase</p>
          </div>

          <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                Current Password
              </label>
              <input
                type="password"
                {...registerPassword('currentPassword')}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-200 border border-border text-sm text-white focus:outline-none focus:border-primary"
              />
              {passwordErrors.currentPassword && (
                <p className="text-xs text-red-400 mt-1">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                New Password
              </label>
              <input
                type="password"
                placeholder="Min 8 chars, 1 letter, 1 number"
                {...registerPassword('newPassword')}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-200 border border-border text-sm text-white focus:outline-none focus:border-primary"
              />
              {passwordErrors.newPassword && (
                <p className="text-xs text-red-400 mt-1">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                Confirm New Password
              </label>
              <input
                type="password"
                {...registerPassword('confirmPassword')}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-200 border border-border text-sm text-white focus:outline-none focus:border-primary"
              />
              {passwordErrors.confirmPassword && (
                <p className="text-xs text-red-400 mt-1">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={passwordSaving}
              className="px-5 py-2.5 rounded-xl bg-surface-50 hover:bg-surface-200 text-white text-xs font-semibold border border-border disabled:opacity-50"
            >
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
