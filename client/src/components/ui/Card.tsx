import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/**
 * A raised paper sheet. Use sparingly — most content sits directly on the
 * page, separated by rules. Reserve Panels for forms and dialogs.
 */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md border border-rule bg-surface shadow-[0_1px_0_var(--rule)]', className)} {...rest} />;
}
