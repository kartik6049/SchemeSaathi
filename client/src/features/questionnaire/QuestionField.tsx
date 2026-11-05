/**
 * Renders one question based on its type (from /api/questions):
 *   enum with many options -> dropdown     enum / range -> form rows
 *   boolean                -> Yes / No     number       -> stepper
 * Also reused (compact) by the admin "Preview & test" tab.
 */
import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { controlClass, Select } from '../../components/ui/Field';
import { OptionTile } from '../../components/ui/OptionTile';
import { useLocalized } from '../../i18n/useLocalized';
import { cn } from '../../lib/cn';
import { OPTION_ICONS } from '../../lib/icons';
import type { ProfileValue, Question } from '../../lib/types';

interface Props {
  question: Question;
  value: ProfileValue | undefined;
  onChange: (value: ProfileValue | undefined) => void;
  compact?: boolean;
}

const DROPDOWN_THRESHOLD = 15;

export function QuestionField({ question, value, onChange, compact }: Props) {
  const { t } = useTranslation();
  const { l } = useLocalized();
  const id = useId();
  const labelId = `${id}-label`;
  const many = (question.options?.length ?? 0) > 4;

  return (
    <fieldset className="animate-rise space-y-3.5" aria-labelledby={labelId}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <legend id={labelId} className={cn(compact ? 'text-sm font-medium' : 'font-serif text-[26px] leading-tight tracking-tight sm:text-[30px]')}>
          {l(question.label)}
        </legend>
        {!compact && <span className="kicker">{question.required ? t('q.required') : t('q.optional')}</span>}
      </div>
      {question.help && !compact && <p className="-mt-1.5 text-sm text-ink-2">{l(question.help)}</p>}

      {question.type === 'number' && <NumberInput question={question} value={value as number | undefined} onChange={onChange} labelId={labelId} />}

      {question.type === 'boolean' && (
        <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-2 gap-2.5">
          <OptionTile label={t('common.yes')} selected={value === true} onSelect={() => onChange(true)} />
          <OptionTile label={t('common.no')} selected={value === false} onSelect={() => onChange(false)} />
        </div>
      )}

      {(question.type === 'enum' || question.type === 'range') &&
        (question.options!.length > DROPDOWN_THRESHOLD ? (
          <Select aria-labelledby={labelId} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)} className="h-13 text-base">
            <option value="">{t('q.selectState')}</option>
            {question.options!.map((o) => (
              <option key={o.value} value={o.value}>
                {l(o.label)}
              </option>
            ))}
          </Select>
        ) : (
          <div role="radiogroup" aria-labelledby={labelId} className={cn('grid gap-2.5', many && 'sm:grid-cols-2')}>
            {question.options!.map((o) => {
              const OptIcon = OPTION_ICONS[o.value];
              return (
                <OptionTile
                  key={o.value}
                  label={l(o.label)}
                  icon={OptIcon && !compact ? <OptIcon className="size-[18px]" strokeWidth={1.75} /> : undefined}
                  selected={value === o.value}
                  onSelect={() => onChange(o.value)}
                />
              );
            })}
          </div>
        ))}

      {!question.required && value !== undefined && !compact && (
        <button type="button" onClick={() => onChange(undefined)} className="link text-sm text-ink-3">
          {t('common.clear')}
        </button>
      )}
    </fieldset>
  );
}

function NumberInput({ question, value, onChange, labelId }: { question: Question; value: number | undefined; onChange: Props['onChange']; labelId: string }) {
  const { t } = useTranslation();
  const min = question.min ?? 0;
  const max = question.max ?? 120;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const invalid = value !== undefined && (value < min || value > max);
  const stepBtn = 'flex size-13 shrink-0 items-center justify-center rounded-md border border-rule bg-surface text-ink-2 transition-colors hover:border-ink hover:text-ink active:translate-y-px';

  return (
    <div>
      <div className="flex max-w-sm items-stretch gap-2.5">
        <button type="button" aria-label={t('q.decrease')} onClick={() => onChange(clamp((value ?? 30) - 1))} className={stepBtn}>
          <Minus className="size-5" />
        </button>
        <div className="relative flex-1">
          <input
            aria-labelledby={labelId}
            inputMode="numeric"
            pattern="[0-9]*"
            value={value ?? ''}
            aria-invalid={invalid}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
              onChange(digits === '' ? undefined : Number(digits));
            }}
            className={cn(controlClass, 'num h-13 text-center font-serif text-3xl')}
            placeholder="—"
          />
          <span className="kicker pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">{t('q.ageUnit')}</span>
        </div>
        <button type="button" aria-label={t('q.increase')} onClick={() => onChange(clamp((value ?? 29) + 1))} className={stepBtn}>
          <Plus className="size-5" />
        </button>
      </div>
      {invalid && <p className="mt-2 text-sm text-bad">{t('q.invalidAge', { min, max })}</p>}
    </div>
  );
}
