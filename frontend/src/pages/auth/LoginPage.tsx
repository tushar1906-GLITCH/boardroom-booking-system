import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarCheck, ShieldCheck, Zap, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Please enter your password'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await login(values);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setErrorMessage(msg);
      toast.error('Authentication failed', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickCredentials = (role: 'admin' | 'employee') => {
    if (role === 'admin') {
      setValue('email', 'admin@company.com');
      setValue('password', 'Admin@12345');
    } else {
      setValue('email', 'alex.chen@company.com');
      setValue('password', 'Password@123');
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-surface to-surface-200 border-r border-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal/5 rounded-full blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary text-white shadow-glow">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">ReserveHub</h1>
            <p className="text-xs text-slate-400 font-mono">Enterprise Room Scheduling</p>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 space-y-6 max-w-md">
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Zero conflict. <br />
            <span className="text-primary-light">Guaranteed room reservations</span> for high-performing teams.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Eliminate meeting room squabbles with real-time availability, PostgreSQL mathematical exclusion constraints, and instant schedule sync.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-teal" />
              <span>Database-enforced GiST exclusion guarantees zero double-bookings</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <Zap className="w-4 h-4 text-primary-light" />
              <span>Instant slot releases upon cancellation</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>HttpOnly cookie session security with JWT rotation</span>
            </div>
          </div>
        </div>

        {/* Demo Fast Login Strip */}
        <div className="relative z-10 p-4 rounded-2xl bg-surface-100/70 border border-border/80">
          <p className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-2">
            Live Demo Quick Fill:
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fillQuickCredentials('admin')}
              className="px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-surface-50/80 text-xs text-slate-200 border border-border transition-colors font-medium"
            >
              👑 Admin Demo
            </button>
            <button
              type="button"
              onClick={() => fillQuickCredentials('employee')}
              className="px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-surface-50/80 text-xs text-slate-200 border border-border transition-colors font-medium"
            >
              💼 Employee Demo
            </button>
          </div>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to your account</h2>
            <p className="mt-2 text-sm text-slate-400">
              Enter your corporate credentials to manage meeting rooms
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
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="admin@company.com"
                  {...register('email')}
                  className="w-full px-4 py-3 pl-10 rounded-xl bg-surface-100 border border-border text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••••••"
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
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo buttons for mobile */}
          <div className="lg:hidden p-3.5 rounded-xl bg-surface-100 border border-border">
            <span className="text-[11px] font-mono text-slate-400 block mb-2 font-bold uppercase">
              Demo Fast-Fill:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin')}
                className="flex-1 px-3 py-1.5 rounded-lg bg-surface-50 text-xs text-slate-200 border border-border text-center"
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('employee')}
                className="flex-1 px-3 py-1.5 rounded-lg bg-surface-50 text-xs text-slate-200 border border-border text-center"
              >
                💼 Employee
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400">
            Need a new account?{' '}
            <Link to="/register" className="text-primary-light font-semibold hover:underline">
              Register as employee
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
