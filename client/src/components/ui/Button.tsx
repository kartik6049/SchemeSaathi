/**
 * Buttons. Rectangular with a small radius (print-form feel), ≥ 44px tall.
 *   primary   — solid civic green, the one main action per view
 *   secondary — ink outline
 *   ghost     — text-only, for low-emphasis actions
 *   quiet     — underlined inline action
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-[background-color,color,border-color,transform] duration-150 select-none disabled:opacity-45 disabled:pointer-events-none active:translate-y-px';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-ink hover:bg-primary-hover',
  secondary: 'border border-rule-strong/80 text-ink hover:bg-ink hover:text-paper',
  ghost: 'text-ink-2 hover:text-ink hover:bg-surface-2',
  danger: 'bg-bad text-paper hover:opacity-90',
  whatsapp: 'bg-[#1f7a4d] text-white hover:bg-[#186540] dark:bg-[#2e9b63] dark:hover:bg-[#2a8c59]',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-10 px-3 text-sm',
  md: 'min-h-11 px-4.5 text-[15px]',
  lg: 'min-h-13 px-6 text-base',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(base, variants[variant], sizes[size], className);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function ButtonLink({ variant, size, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className as string)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
