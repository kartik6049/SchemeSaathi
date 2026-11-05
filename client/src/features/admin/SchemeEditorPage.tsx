/**
 * Create / edit a scheme (FR-17, FR-18, UC-03).
 * Tabs: details (bilingual text, taxonomy), eligibility rules, documents,
 * review (provenance of imported schemes, matching switches) and preview &
 * test (try draft rules against a sample profile before publishing).
 * Server validation errors are mapped back onto fields.
 */
import { ArrowLeft, CircleCheck, FlaskConical, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, ButtonLink } from '../../components/ui/Button';
import { FormField, Input, Select, Textarea } from '../../components/ui/Field';
import { Label, Status } from '../../components/ui/Label';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useMeta, useQuestions } from '../../hooks/useCached';
import { useResource } from '../../hooks/useResource';
import { useLocalized } from '../../i18n/useLocalized';
import { ApiError, api } from '../../lib/api';
import { cn } from '../../lib/cn';
import type { Evaluation, Localized, Profile, RuleError, Scheme, SchemeInput } from '../../lib/types';
import { QuestionField } from '../questionnaire/QuestionField';
import { RuleBuilder } from './RuleBuilder';

type Tab = 'details' | 'rules' | 'documents' | 'review' | 'preview';
const empty: Localized = { en: '', hi: '' };

export const EMPTY_SCHEME: SchemeInput = {
  slug: '', name: empty, ministry: empty, state: null, category: 'social_welfare', beneficiaryTypes: [],
  summary: empty, benefits: empty, eligibility: empty, howToApply: empty, officialUrl: 'https://',
  benefitTier: 2, deadline: null, isActive: true, rules: [], documents: [], audience: 'individual', matchable: true, needsReview: false,
};

function toInput(s: Scheme): SchemeInput {
  return {
    slug: s.slug, name: s.name, ministry: s.ministry, state: s.state, category: s.category, beneficiaryTypes: s.beneficiaryTypes,
    summary: s.summary, benefits: s.benefits, eligibility: s.eligibility, howToApply: s.howToApply, officialUrl: s.officialUrl,
    benefitTier: s.benefitTier, deadline: s.deadline, lastVerifiedAt: s.lastVerifiedAt, isActive: s.isActive, rules: s.rules,
    documents: s.documents.map((d) => d.code), audience: s.audience, matchable: s.matchable, needsReview: s.needsReview,
  };
}

export function SchemeEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const { t } = useTranslation();
  const { l } = useLocalized();
  const navigate = useNavigate();
  const meta = useMeta();
  const questions = useQuestions();

  const scheme = useResource(() => api.admin.scheme(Number(id)), [id], !isNew);
  const fields = useResource(() => api.admin.fields(), []);
  const docs = useResource(() => api.admin.documents(), []);

  const [form, setForm] = useState<SchemeInput>(EMPTY_SCHEME);
  const [tab, setTab] = useState<Tab>('details');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ruleErrors, setRuleErrors] = useState<RuleError[]>([]);
  const [rulesValid, setRulesValid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [testProfile, setTestProfile] = useState<Profile>({});
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [docFilter, setDocFilter] = useState('');

  useEffect(() => {
    if (scheme.data) setForm(toInput(scheme.data));
    else if (isNew) setForm(EMPTY_SCHEME);
  }, [scheme.data, isNew]);

  if ((!isNew && scheme.loading) || fields.loading || docs.loading) return <LoadingState />;
  if (scheme.error || fields.error || docs.error) return <ErrorState onRetry={() => (scheme.reload(), fields.reload(), docs.reload())} />;

  const set = <K extends keyof SchemeInput>(key: K, value: SchemeInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage(null);
  };
  const setLoc = (key: keyof SchemeInput, lang: 'en' | 'hi', value: string) => set(key, { ...(form[key] as Localized), [lang]: value } as never);
  const err = (path: string) => fieldErrors[path];

  const save = async () => {
    setSaving(true);
    setFieldErrors({});
    setRuleErrors([]);
    setMessage(null);
    try {
      const saved = isNew ? await api.admin.create(form) : await api.admin.update(Number(id), form);
      setMessage({ tone: 'ok', text: t('admin.saved') });
      if (isNew) navigate(`/admin/schemes/${saved.id}`, { replace: true });
      else scheme.setData(saved);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'VALIDATION_ERROR' && Array.isArray(e.details)) {
        const map: Record<string, string> = {};
        for (const d of e.details as { path: string; message: string }[]) map[d.path] = d.message;
        setFieldErrors(map);
        setTab(Object.keys(map).some((p) => p.startsWith('rules')) ? 'rules' : 'details');
      } else if (e instanceof ApiError && e.code === 'INVALID_RULES') {
        setRuleErrors(e.details as RuleError[]);
        setTab('rules');
      }
      setMessage({ tone: 'error', text: e instanceof ApiError && e.code !== 'VALIDATION_ERROR' && e.code !== 'INVALID_RULES' ? e.message : t('admin.fixErrors') });
    } finally {
      setSaving(false);
    }
  };

  const validate = async () => {
    const r = await api.admin.validateRules(form.rules);
    setRuleErrors(r.errors);
    setRulesValid(r.valid);
  };

  const runTest = async () => {
    try {
      setEvaluation(await api.admin.preview(form.state, form.rules, testProfile));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'INVALID_RULES') setRuleErrors(e.details as RuleError[]);
      setEvaluation(null);
    }
  };

  const localized = (key: keyof SchemeInput, label: string, multiline = false) => (
    <div className="grid gap-4 md:grid-cols-2">
      {(['en', 'hi'] as const).map((lang) => (
        <FormField key={lang} label={`${label} · ${t(lang === 'en' ? 'admin.english' : 'admin.hindi')}`} error={err(`${key}.${lang}`)}>
          {(p) =>
            multiline ? (
              <Textarea {...p} lang={lang} value={(form[key] as Localized)[lang]} onChange={(e) => setLoc(key, lang, e.target.value)} />
            ) : (
              <Input {...p} lang={lang} value={(form[key] as Localized)[lang]} onChange={(e) => setLoc(key, lang, e.target.value)} />
            )
          }
        </FormField>
      ))}
    </div>
  );

  const tabs: [Tab, string, number?][] = [
    ['details', t('admin.tabDetails')],
    ['rules', t('admin.tabRules'), form.rules.length],
    ['documents', t('admin.tabDocuments'), form.documents.length],
    ['review', t('admin.reviewTitle')],
    ['preview', t('admin.tabPreview')],
  ];
  const visibleDocs = (docs.data?.items ?? []).filter(
    (d) => form.documents.includes(d.code) || !docFilter || d.name.en.toLowerCase().includes(docFilter.toLowerCase()) || d.code.includes(docFilter.toLowerCase()),
  );

  return (
    <div className="space-y-6 pb-24">
      <div>
        <ButtonLink to="/admin/schemes" variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} className="-ml-3">
          {t('admin.back')}
        </ButtonLink>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{isNew ? t('admin.newScheme') : l(form.name) || t('admin.editScheme')}</h1>
          {!isNew && <Label tone={form.isActive ? 'ok' : 'ink'}>{form.isActive ? t('admin.active') : t('admin.inactive')}</Label>}
          {form.needsReview && <Label tone="accent">{t('admin.filterPending')}</Label>}
        </div>
      </div>

      <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-rule">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn('-mb-px flex min-h-12 shrink-0 items-baseline gap-1.5 border-b-2 text-[15px] transition-colors', tab === key ? 'border-primary text-ink' : 'border-transparent text-ink-3 hover:text-ink')}
          >
            {label}
            {count !== undefined && <span className="num text-xs text-ink-3">{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label={t('admin.slug')} hint={t('admin.slugHelp')} error={err('slug')}>
              {(p) => <Input {...p} className="font-mono" value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} />}
            </FormField>
            <FormField label={t('admin.category')} error={err('category')}>
              {(p) => (
                <Select {...p} value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {meta.data?.categories.map((c) => <option key={c.value} value={c.value}>{l(c.label)}</option>)}
                </Select>
              )}
            </FormField>
            <FormField label={t('admin.stateScope')} error={err('state')}>
              {(p) => (
                <Select {...p} value={form.state ?? ''} onChange={(e) => set('state', e.target.value || null)}>
                  <option value="">{t('admin.central')}</option>
                  {meta.data?.states.map((s) => <option key={s.value} value={s.value}>{l(s.label)}</option>)}
                </Select>
              )}
            </FormField>
          </div>
          {localized('name', t('admin.name'))}
          {localized('ministry', t('admin.ministry'))}
          {localized('summary', t('admin.summary'))}
          {localized('benefits', t('admin.benefits'), true)}
          {localized('eligibility', t('admin.eligibility'), true)}
          {localized('howToApply', t('admin.howToApply'), true)}

          <fieldset>
            <legend className="text-sm font-medium text-ink-2">{t('admin.beneficiaryTypes')}</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {meta.data?.beneficiaryTypes.map((b) => {
                const on = form.beneficiaryTypes.includes(b.value);
                return (
                  <button
                    key={b.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('beneficiaryTypes', on ? form.beneficiaryTypes.filter((x) => x !== b.value) : [...form.beneficiaryTypes, b.value])}
                    className={cn('min-h-9 rounded-sm border px-3 text-sm transition-colors', on ? 'border-primary bg-primary text-primary-ink' : 'border-rule hover:border-ink-3')}
                  >
                    {l(b.label)}
                  </button>
                );
              })}
            </div>
            {err('beneficiaryTypes') && <p className="mt-1 text-xs text-bad">{err('beneficiaryTypes')}</p>}
          </fieldset>

          <div className="grid gap-4 md:grid-cols-5">
            <FormField label={t('admin.officialUrl')} error={err('officialUrl')} className="md:col-span-2">
              {(p) => <Input {...p} type="url" value={form.officialUrl} onChange={(e) => set('officialUrl', e.target.value)} />}
            </FormField>
            <FormField label={t('admin.benefitTier')}>
              {(p) => (
                <Select {...p} value={form.benefitTier} onChange={(e) => set('benefitTier', Number(e.target.value))}>
                  {[1, 2, 3].map((n) => <option key={n} value={n}>{t(`common.benefit_${n}`)}</option>)}
                </Select>
              )}
            </FormField>
            <FormField label={t('admin.deadline')} error={err('deadline')}>
              {(p) => <Input {...p} type="date" value={form.deadline ?? ''} onChange={(e) => set('deadline', e.target.value || null)} />}
            </FormField>
            <FormField label={t('admin.lastVerified')} error={err('lastVerifiedAt')}>
              {(p) => <Input {...p} type="date" value={form.lastVerifiedAt ?? ''} onChange={(e) => set('lastVerifiedAt', e.target.value || undefined)} />}
            </FormField>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={form.isActive ?? true} onChange={(e) => set('isActive', e.target.checked)} />
            {t('admin.isActive')}
          </label>
        </div>
      )}

      {tab === 'rules' && (
        <div className="space-y-5">
          <p className="max-w-3xl border-l-2 border-primary pl-3 text-sm text-ink-2">{t('admin.rulesHelp')}</p>
          <RuleBuilder
            rules={form.rules}
            fields={fields.data!.fields}
            errors={ruleErrors}
            onChange={(rules) => {
              set('rules', rules);
              setRulesValid(false);
            }}
          />
          <div className="flex items-center gap-3 border-t border-rule pt-4">
            <Button variant="secondary" onClick={validate} icon={<CircleCheck className="size-4" />}>
              {t('admin.validate')}
            </Button>
            {rulesValid && <span className="text-sm font-medium text-ok">{t('admin.rulesValid')}</span>}
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-2">{t('admin.documentsHelp')}</p>
          <Input placeholder={t('admin.searchSchemes')} aria-label={t('admin.searchSchemes')} value={docFilter} onChange={(e) => setDocFilter(e.target.value)} className="max-w-sm" />
          <div className="grid gap-x-8 sm:grid-cols-2">
            {visibleDocs.slice(0, 200).map((d) => {
              const on = form.documents.includes(d.code);
              return (
                <label key={d.code} className="flex cursor-pointer items-start gap-3 border-b border-rule py-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                    checked={on}
                    onChange={() => set('documents', on ? form.documents.filter((c) => c !== d.code) : [...form.documents, d.code])}
                  />
                  <span className={on ? 'font-medium' : ''}>
                    {l(d.name)} <span className="block font-mono text-xs text-ink-3">{d.code}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'review' && (
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-5">
            <dl className="divide-y divide-rule border-y border-rule text-sm">
              <div className="flex justify-between py-2.5">
                <dt className="text-ink-3">{t('admin.source')}</dt>
                <dd>{scheme.data ? t(`admin.source_${scheme.data.source}`) : t('admin.source_admin')}</dd>
              </div>
              {scheme.data?.sourceUrl && (
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-ink-3">URL</dt>
                  <dd className="truncate">
                    <a className="link" href={scheme.data.sourceUrl} target="_blank" rel="noopener noreferrer">{scheme.data.sourceUrl}</a>
                  </dd>
                </div>
              )}
            </dl>
            <FormField label={t('admin.audience')}>
              {(p) => (
                <Select {...p} value={form.audience ?? 'individual'} onChange={(e) => set('audience', e.target.value as SchemeInput['audience'])}>
                  {(['individual', 'family', 'organisation'] as const).map((a) => <option key={a} value={a}>{t(`admin.audience_${a}`)}</option>)}
                </Select>
              )}
            </FormField>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={form.matchable ?? true} onChange={(e) => set('matchable', e.target.checked)} />
              {t('admin.matchable')}
            </label>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={form.needsReview ?? false} onChange={(e) => set('needsReview', e.target.checked)} />
              {t('admin.needsReview')}
            </label>
          </div>
          {scheme.data?.importNotes && scheme.data.importNotes.length > 0 && (
            <div>
              <p className="kicker border-b border-rule-strong pb-2">{t('admin.importNotes')}</p>
              <ul className="mt-2 space-y-1 font-mono text-xs text-ink-2">
                {scheme.data.importNotes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'preview' && (
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-2xl tracking-tight">
                <FlaskConical className="size-5 text-accent" /> {t('admin.testProfile')}
              </h2>
              <p className="text-sm text-ink-2">{t('admin.previewHelp')}</p>
            </div>
            {questions.data?.steps.flatMap((s) => s.fields).map((q) => (
              <QuestionField key={q.key} compact question={{ ...q, required: false }} value={testProfile[q.key]} onChange={(v) => setTestProfile((p) => ({ ...p, [q.key]: v }))} />
            ))}
            <Button onClick={runTest} className="w-full">{t('admin.runTest')}</Button>
          </div>
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            {evaluation && (
              <div className="space-y-3 border-y border-rule-strong py-4" aria-live="polite">
                <Status kind={evaluation.status}>{t(`admin.status_${evaluation.status}`)}</Status>
                <ul className="space-y-1 text-sm">
                  {evaluation.reasons.map((r, i) => <li key={i}>✓ {l(r.text)}</li>)}
                  {evaluation.uncertainReasons.map((r, i) => <li key={`u${i}`}>? {l(r.text)}</li>)}
                  {evaluation.missingFields.map((f) => <li key={f} className="text-ink-3">· {t('fields.missing')}: {f}</li>)}
                </ul>
              </div>
            )}
            <PreviewCard form={form} />
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-rule-strong bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3 sm:px-6">
          {message && (
            <span role="status" className={cn('mr-auto text-sm font-medium', message.tone === 'ok' ? 'text-ok' : 'text-bad')}>
              {message.text}
            </span>
          )}
          <ButtonLink to="/admin/schemes" variant="ghost">{t('admin.cancel')}</ButtonLink>
          <Button onClick={save} loading={saving} icon={<Save className="size-4" />}>
            {saving ? t('admin.saving') : isNew ? t('admin.create') : t('admin.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** How the scheme reads to citizens, in both languages side by side. */
function PreviewCard({ form }: { form: SchemeInput }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {(['en', 'hi'] as const).map((lang) => (
        <div key={lang} className="space-y-2 border-t-2 border-rule-strong pt-3" lang={lang}>
          <p className="kicker">{lang.toUpperCase()}</p>
          <h3 className="font-serif text-xl tracking-tight">{form.name[lang] || '—'}</h3>
          <p className="text-xs text-ink-3">{form.ministry[lang]}</p>
          <p className="text-sm text-ink-2">{form.summary[lang]}</p>
          <p className="line-clamp-6 text-sm">{form.benefits[lang]}</p>
        </div>
      ))}
    </div>
  );
}
