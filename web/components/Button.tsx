'use client';

import { clsx } from 'clsx';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-accent text-fg-on-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-bg-elevated border border-border text-fg-primary hover:bg-bg-pressed disabled:opacity-50',
  ghost:
    'text-fg-primary hover:bg-bg-overlay disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'text-fg-tertiary hover:bg-danger-soft hover:text-danger disabled:opacity-50',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm gap-2 min-h-[36px]',
  md: 'px-5 py-3 text-base gap-2 min-h-[44px]',
  lg: 'px-6 py-4 text-lg gap-3 min-h-[52px]',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'secondary', size = 'md', fullWidth, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  );
});
