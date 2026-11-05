/**
 * Shared loading / error / empty states, styled as printed notices.
 */
import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { Spinner } from './Spinner';

export function LoadingState({ label, className }: { label?: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <div role="status" className={cn('flex items-center justify-center gap-3 py-20 text-ink-3', className)}>
      <Spinner className="size-5 text-primary" />
      <span className="text-sm">{label ?? t('common.loading')}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-start gap-3 border-l-2 border-bad py-2 pl-5 my-16">
      <p className="flex items-center gap-2 font-medium text-bad">
        <CircleAlert className="size-4" /> {message ?? t('common.error')}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="border-y border-rule py-12 text-center">
      <p className="font-serif text-2xl">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md text-ink-2">{body}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-sm bg-surface-2', className)} />;
}
