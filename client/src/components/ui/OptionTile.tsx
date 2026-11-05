/**
 * One choice in a question, drawn like a row on a printed form: a square
 * check box, the label, and an optional icon. role="radio" for screen readers.
 */
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface Props {
  selected: boolean;
  onSelect: () => void;
  label: string;
  icon?: ReactNode;
}

export function OptionTile({ selected, onSelect, label, icon }: Props) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'group flex min-h-13 w-full items-center gap-3 rounded-md border px-3.5 py-2.5 text-left text-[15px] transition-colors',
        selected ? 'border-primary bg-primary-soft text-ink' : 'border-rule bg-surface hover:border-ink-3',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-sm border-[1.5px] transition-colors',
          selected ? 'border-primary bg-primary text-primary-ink' : 'border-ink-3 group-hover:border-ink',
        )}
      >
        {selected && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <span className="flex-1 font-medium">{label}</span>
      {icon && <span className={cn('shrink-0 transition-colors', selected ? 'text-primary' : 'text-ink-3')}>{icon}</span>}
    </button>
  );
}
