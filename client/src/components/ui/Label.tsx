/**
 * Small typographic labels (not pills): a coloured square marker + small caps.
 * `Status` is the semantic version — it always pairs colour with an icon and
 * text so meaning never depends on colour alone.
 */
import { CircleAlert, CircleCheck, CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'ink' | 'primary' | 'accent' | 'ok' | 'warn' | 'bad';

const marker: Record<Tone, string> = {
  ink: 'bg-ink-3',
  primary: 'bg-primary',
  accent: 'bg-accent',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
};

export function Label({ tone = 'ink', children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-2', className)}>
      {icon ?? <span aria-hidden className={cn('size-1.5', marker[tone])} />}
      {children}
    </span>
  );
}

export type StatusKind = 'eligible' | 'possible' | 'ineligible';

const STATUS: Record<StatusKind, { icon: typeof CircleCheck; cls: string }> = {
  eligible: { icon: CircleCheck, cls: 'text-ok bg-ok-soft' },
  possible: { icon: CircleHelp, cls: 'text-warn bg-warn-soft' },
  ineligible: { icon: CircleAlert, cls: 'text-bad bg-bad-soft' },
};

export function Status({ kind, children, className }: { kind: StatusKind; children: ReactNode; className?: string }) {
  const { icon: Icon, cls } = STATUS[kind];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium', cls, className)}>
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}
