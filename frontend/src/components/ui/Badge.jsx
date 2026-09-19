import React from 'react';

export function Badge({ 
  variant = 'default', 
  className = '', 
  children, 
  ...props 
}) {
  const variants = {
    default: 'bg-sky-50 text-sky-800 border-sky-200/80',
    primary: 'bg-sky-600 text-white border-transparent shadow-xs',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200/80',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs font-semibold',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
    mint: 'bg-teal-50 text-teal-800 border-teal-200 font-semibold',
    warning: 'bg-amber-50 text-amber-900 border-amber-300 font-semibold',
    critical: 'bg-rose-50 text-rose-800 border-rose-300 font-semibold',
    danger: 'bg-rose-50 text-rose-800 border-rose-300 font-semibold',
    ai: 'bg-purple-50 text-purple-800 border-purple-200 shadow-2xs font-semibold',
    outline: 'border-sky-300 text-slate-700 bg-white/70 backdrop-blur-xs'
  };

  const currentVariant = variants[variant] || variants.default;

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${currentVariant} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
