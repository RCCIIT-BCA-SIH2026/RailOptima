import React from 'react';

export function Badge({ 
  variant = 'default', 
  className = '', 
  children, 
  ...props 
}) {
  const variants = {
    default: 'bg-blue-50 text-blue-700 border-blue-200/80',
    primary: 'bg-blue-600 text-white border-transparent',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    critical: 'bg-rose-50 text-rose-700 border-rose-200',
    ai: 'bg-purple-50 text-purple-700 border-purple-200 shadow-2xs',
    outline: 'border-slate-300 text-slate-700 bg-transparent'
  };

  const currentVariant = variants[variant] || variants.default;

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentVariant} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

