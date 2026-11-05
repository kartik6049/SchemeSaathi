/**
 * Guided questionnaire (FR-01..FR-04, UC-01), laid out like a printed form:
 * a large serif step numeral in the margin, questions on the right.
 * - Steps/questions come from GET /api/questions (≤ 2 per step).
 * - Questions with `showIf` appear only when relevant; empty steps are skipped.
 * - `?step=N` jumps to a step (used by "Answer now" on results).
 * - Answers persist locally; finishing navigates to /results?p=<encoded>.
 */
import { ArrowLeft, ArrowRight, Lock, RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useProfile } from '../../context/ProfileContext';
import { useQuestions } from '../../hooks/useCached';
import { track } from '../../lib/analytics';
import { encodeProfile } from '../../lib/profileCodec';
import { ProgressBar } from './ProgressBar';
import { QuestionField } from './QuestionField';
import { canContinue, sanitize, visibleFields, visibleSteps } from './validation';

export function QuestionnairePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, error, loading, retry } = useQuestions();
  const { answers, step, setAnswer, setStep, reset, hasProgress } = useProfile();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const requested = Number(params.get('step'));
    if (requested && data && requested <= data.totalSteps) {
      setStep(requested);
      setParams({}, { replace: true });
    }
  }, [params, data, setStep, setParams]);

  useEffect(() => {
    if (!started.current && !hasProgress) {
      started.current = true;
      track('questionnaire_start');
    }
  }, [hasProgress]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={retry} />;

  // Work over the steps that currently have visible questions.
  const steps = visibleSteps(data.steps, answers);
  const position = Math.max(0, steps.findIndex((s) => s.step >= step));
  const current = steps[position] ?? steps[steps.length - 1];
  const fields = visibleFields(current, answers);
  const ok = canContinue(fields, answers);
  const isLast = position === steps.length - 1;
  const allQuestions = data.steps.flatMap((s) => s.fields);
  const optionalOnly = fields.every((f) => !f.required);

  const goNext = () => {
    if (!ok) return;
    track('step_complete', { step: current.step });
    if (isLast) {
      track('questionnaire_complete');
      navigate(`/results?p=${encodeProfile(sanitize(answers, allQuestions))}`);
    } else setStep(steps[position + 1].step);
  };
  const goBack = () => position > 0 && setStep(steps[position - 1].step);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="flex items-center justify-between gap-4">
        <p className="kicker">{t('q.title')}</p>
        {hasProgress && (
          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-ink">
            <RotateCcw className="size-3.5" /> {t('q.startOver')}
          </button>
        )}
      </div>
      <div className="mt-3">
        <ProgressBar current={position + 1} total={steps.length} />
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-[180px_1fr] md:gap-14">
        {/* Margin numeral */}
        <div aria-hidden className="flex items-baseline gap-3 md:block">
          <p key={current.step} className="num animate-rise font-serif text-7xl leading-none text-primary md:text-[112px]">
            {String(position + 1).padStart(2, '0')}
          </p>
          <p className="num kicker md:mt-3">
            / {String(steps.length).padStart(2, '0')}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            goNext();
          }}
          className="space-y-10"
          key={current.step}
        >
          <h2 ref={headingRef} tabIndex={-1} className="sr-only">
            {t('q.stepOf', { current: position + 1, total: steps.length })}
          </h2>
          {fields.map((f) => (
            <QuestionField key={f.key} question={f} value={answers[f.key]} onChange={(v) => setAnswer(f.key, v)} />
          ))}

          <p className="text-sm text-ink-3">{optionalOnly ? t('q.skipHint') : !ok ? t('q.fillRequired') : ' '}</p>

          <div className="flex flex-col-reverse gap-3 border-t border-rule pt-6 sm:flex-row sm:items-center">
            <Button variant="ghost" onClick={goBack} disabled={position === 0} icon={<ArrowLeft className="size-4" />}>
              {t('common.back')}
            </Button>
            <div className="flex flex-1 flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {optionalOnly && (
                <Button variant="secondary" onClick={goNext}>
                  {t('common.skip')}
                </Button>
              )}
              <Button type="submit" size="lg" disabled={!ok}>
                {isLast ? t('q.seeResults') : t('common.next')}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-ink-3">
            <Lock className="size-3" /> {t('q.savedLocally')}
          </p>
        </form>
      </div>
    </div>
  );
}
