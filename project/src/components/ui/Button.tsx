import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary-700 text-white shadow-sm hover:bg-primary-800 focus-visible:ring-primary-500/40',
  accent: 'bg-accent-700 text-white shadow-sm hover:bg-accent-800 focus-visible:ring-accent-500/40',
  secondary: 'bg-secondary-100 text-secondary-800 hover:bg-secondary-200 focus-visible:ring-secondary-500/40 dark:bg-secondary-900/40 dark:text-secondary-200 dark:hover:bg-secondary-900/60',
  outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-slate-400/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  ghost: 'text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400/40 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-error-600 text-white shadow-sm hover:bg-error-700 focus-visible:ring-error-500/40',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
