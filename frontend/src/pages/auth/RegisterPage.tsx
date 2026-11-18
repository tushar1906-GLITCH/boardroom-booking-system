import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarCheck, User, Mail, Lock, Building, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(120),
  email: z.string().email('Please enter a valid corporate email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number'),
  department: z.string().max(100).optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      department: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await registerAuth(values);
      toast.success('Registration successful! Welcome to ReserveHub.');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      setErrorMessage(msg);
      toast.error('Registration failed', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-surface to-surface-200 border-r border-border relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary text-white shadow-glow">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">ReserveHub</h1>
            <p className="text-xs text-slate-400 font-mono">Enterprise Room Scheduling</p>
          </div>
        </div>

        <div className="relative z-10 space-y-4 max-w-md">
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Join your team on <br />
            <span className="text-primary-light">ReserveHub</span>.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Create your corporate account to start reserving focus pods, collaboration suites, and conference rooms effortlessly.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-500 font-mono">
          © 2026 ReserveHub Systems Inc. All rights reserved.
        </div>
      </div>

      {/* Right Register Form */}
      <div className="flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Create your account</h2>
            <p className="mt-2 text-sm text-slate-400">
              Register as an employee to book and manage rooms
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-2.5 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Full Name <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  {...register('fullName')}
                  className="w-full px-4 py-3 pl-10 rounded-xl bg-surface-100 border border-border text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
              {errors.fullName && <p className="text-xs text-red-400 mt-1">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Corporate Email <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="alex.morgan@company.com"
                  {...register('email')}
                  className="w-full px-4 py-3 pl-10 rounded-xl bg-surface-100 border border-border text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Department / Team
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Engineering, Product, Marketing"
                  {...register('department')}
                  className="w-full px-4 py-3 pl-10 rounded-xl bg-surface-100 border border-border text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
                />
                <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
              {errors.department && <p className="text-xs text-red-400 mt-1">{errors.department.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Password <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Min 8 chars, 1 letter, 1 number"
                  {...register('password')}
                  className="w-full px-4 py-3 pl-10 rounded-xl bg-surface-100 border border-border text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold shadow-glow transition-all active:scale-95"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-light font-semibold hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
