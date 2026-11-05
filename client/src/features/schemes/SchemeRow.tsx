/** One scheme as a ledger row on the browse page. The whole row is the link. */
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocalized } from '../../i18n/useLocalized';
import type { SchemeSummary } from '../../lib/types';
import { ReviewMark, SchemeMetaLine } from './SchemeMeta';

export function SchemeRow({ scheme, index }: { scheme: SchemeSummary; index: number }) {
  const { l } = useLocalized();
  return (
    <li className="animate-rise border-b border-rule" style={{ animationDelay: `${Math.min(index % 20, 10) * 30}ms` }}>
      <Link to={`/schemes/${scheme.slug}`} className="group grid grid-cols-[1fr_auto] gap-4 py-5 transition-colors hover:bg-surface/60 sm:px-2">
        <div className="min-w-0 space-y-1.5">
          <SchemeMetaLine scheme={scheme} extra={<ReviewMark needsReview={scheme.needsReview} />} />
          <h3 className="font-serif text-xl leading-snug tracking-tight group-hover:text-primary sm:text-[22px]">{l(scheme.name)}</h3>
          <p className="line-clamp-2 max-w-3xl text-[15px] text-ink-2">{l(scheme.summary)}</p>
        </div>
        <ArrowUpRight aria-hidden className="mt-6 size-5 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </Link>
    </li>
  );
}
