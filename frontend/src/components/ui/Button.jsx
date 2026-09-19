import React from 'react';

export function Button({ 
  variant = 'emerald', 
  size = 'default',
  className = '', 
  children, 
  disabled = false,
  ...props 
}) {
  const variants = {
    emerald: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 border border-emerald-500/30',
    primary: 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-md shadow-sky-600/20 border border-sky-500/30',
    sky: 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-500/20',
    secondary: 'bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 shadow-2xs',
    outline: 'border border-slate-200 hover:bg-sky-50/80 text-slate-700 bg-white/90 shadow-2xs backdrop-blur-xs',
    glass: 'bg-white/80 hover:bg-white text-slate-800 border border-sky-200/80 shadow-xs backdrop-blur-md',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs',
    critical: 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs',
    destructive: 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs',
    ai: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-md shadow-purple-500/25 border border-purple-400/30',
    ghost: 'hover:bg-sky-50 text-slate-700'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg',
    default: 'px-4 py-2 text-xs font-bold rounded-xl',
    lg: 'px-5 py-2.5 text-sm font-bold rounded-xl',
    icon: 'p-2 rounded-xl'
  };

  const currentVariant = variants[variant] || variants.emerald;
  const currentSize = sizes[size] || sizes.default;

  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${currentVariant} ${currentSize} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
