import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-surface-100 border border-border flex items-center justify-center text-primary-light shadow-glow">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-white tracking-tight font-mono">404</h1>
      <h2 className="text-lg font-bold text-slate-200">Page Not Found</h2>
      <p className="text-xs text-slate-400 max-w-sm">
        The requested reservation page, room route, or administrative resource does not exist.
      </p>
      <Link
        to="/dashboard"
        className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow transition-all active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Dashboard
      </Link>
    </div>
  );
};
