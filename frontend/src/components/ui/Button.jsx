import React from 'react';

export function Button({ 
  variant = 'primary', 
  size = 'default',
  className = '', 
  children, 
  disabled = false,
  ...props 
}) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700 bg-white shadow-2xs',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
    critical: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
    destructive: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
    ai: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20',
    ghost: 'hover:bg-slate-100 text-slate-700'
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-xs rounded-lg',
    default: 'px-4 py-2 text-xs font-medium rounded-lg',
    lg: 'px-5 py-2.5 text-sm font-medium rounded-xl',
    icon: 'p-2 rounded-lg'
  };

  const currentVariant = variants[variant] || variants.primary;
  const currentSize = sizes[size] || sizes.default;

  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${currentVariant} ${currentSize} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

