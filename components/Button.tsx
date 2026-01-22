import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  // Removed shadow, active translation, and border-b-4. Added border-2 for consistent "boxed" look.
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-bold transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:pointer-events-none border-2";
  
  const variants = {
    primary: "bg-indigo-500 text-white border-indigo-500 hover:bg-indigo-600 hover:border-indigo-600 focus:ring-indigo-200",
    secondary: "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-100",
    danger: "bg-rose-500 text-white border-rose-500 hover:bg-rose-600 hover:border-rose-600 focus:ring-rose-200",
    success: "bg-lime-500 text-white border-lime-500 hover:bg-lime-600 hover:border-lime-600 focus:ring-lime-200",
    outline: "bg-transparent border-slate-300 text-slate-600 hover:border-slate-800 hover:text-slate-800 focus:ring-slate-200"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-5 text-sm",
    lg: "h-12 px-8 text-base"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};