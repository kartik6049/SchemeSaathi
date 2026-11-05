/**
 * Form primitives with consistent styling and accessible error wiring
 * (aria-invalid / aria-describedby). Inputs are flat rectangles on paper.
 */
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const controlClass =
  'min-h-11 w-full rounded-md border border-rule bg-surface px-3 py-2 text-[15px] text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 aria-[invalid=true]:border-bad';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(controlClass, className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(controlClass, 'min-h-28 leading-relaxed', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...rest }, ref) {
  return <select ref={ref} className={cn(controlClass, 'cursor-pointer pr-9', className)} {...rest} />;
});

interface FormFieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
  className?: string;
}

export function FormField({ label, hint, error, children, className }: FormFieldProps) {
  const id = useId();
  const descId = `${id}-desc`;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-2">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': hint || error ? descId : undefined })}
      {(error || hint) && (
        <p id={descId} className={cn('text-xs', error ? 'text-bad' : 'text-ink-3')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
