/**
 * Visual eligibility-rule editor (FR-06, FR-18). Groups are OR-ed, rules
 * inside a group are AND-ed. Operator and value inputs adapt to the
 * selected field's type, so most invalid rules can't even be entered;
 * the server validator catches the rest and errors appear inline.
 */
import { Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { useLocalized } from '../../i18n/useLocalized';
import { cn } from '../../lib/cn';
import type { AdminField, Operator, Rule, RuleError, RuleValue } from '../../lib/types';
import { compactGroups, defaultValue, groupWithIndex, nextGroupId, OPERATOR_LABEL, OPERATORS_BY_TYPE } from './ruleUtils';

interface Props {
  rules: Rule[];
  fields: AdminField[];
  errors: RuleError[];
  onChange: (rules: Rule[]) => void;
}

export function RuleBuilder({ rules, fields, errors, onChange }: Props) {
  const { t } = useTranslation();
  const { l } = useLocalized();
  const fieldOf = (key: string) => fields.find((f) => f.key === key);

  const update = (index: number, patch: Partial<Rule>) => onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index: number) => onChange(compactGroups(rules.filter((_, i) => i !== index)));
  const add = (groupId: number) => {
    const f = fields.find((x) => x.key === 'age') ?? fields[0];
    const op = OPERATORS_BY_TYPE[f.type][0];
    onChange([...rules, { groupId, field: f.key, operator: op, value: defaultValue(f, op) }]);
  };
  const removeGroup = (groupId: number) => onChange(compactGroups(rules.filter((r) => r.groupId !== groupId)));

  const groups = groupWithIndex(rules);

  return (
    <div className="space-y-2">
      {groups.length === 0 && <p className="border-l-2 border-warn py-1 pl-3 text-sm text-warn">{t('admin.noRules')}</p>}
      {groups.map(([groupId, items], gi) => (
        <div key={groupId}>
          {gi > 0 && (
            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-accent/60" />
              <span className="kicker text-accent">{t('admin.orDivider')}</span>
              <span className="h-px flex-1 bg-accent/60" />
            </div>
          )}
          <section className="border-l-2 border-primary pl-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="kicker text-ink">{t('admin.group', { n: groupId })}</h3>
              <button type="button" onClick={() => removeGroup(groupId)} className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-bad">
                <X className="size-3.5" /> {t('admin.removeGroup')}
              </button>
            </div>
            <div className="space-y-1.5">
              {items.map(({ rule, index }, ri) => {
                const field = fieldOf(rule.field);
                const rowErrors = errors.filter((e) => e.index === index);
                return (
                  <div key={index}>
                    {ri > 0 && <p className="kicker py-0.5 pl-1 text-[10px]">{t('admin.andLabel')}</p>}
                    <div className={cn('grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]', rowErrors.length ? 'border-bad bg-bad-soft/40' : 'border-rule bg-surface')}>
                      <Select
                        aria-label={t('admin.field')}
                        value={rule.field}
                        onChange={(e) => {
                          const f = fieldOf(e.target.value);
                          const op = f ? OPERATORS_BY_TYPE[f.type][0] : rule.operator;
                          update(index, { field: e.target.value, operator: op, value: defaultValue(f, op) });
                        }}
                      >
                        {fields.map((f) => (
                          <option key={f.key} value={f.key}>
                            {l(f.label)} ({f.key})
                          </option>
                        ))}
                      </Select>
                      <Select
                        aria-label={t('admin.operator')}
                        value={rule.operator}
                        onChange={(e) => {
                          const op = e.target.value as Operator;
                          const listChange = (op === 'in' || op === 'not_in') !== Array.isArray(rule.value);
                          const typeChange = field?.type === 'range' && (op === '=' || op === '!=') !== (typeof rule.value === 'string');
                          update(index, { operator: op, ...(listChange || typeChange ? { value: defaultValue(field, op) } : {}) });
                        }}
                      >
                        {(field ? OPERATORS_BY_TYPE[field.type] : (Object.keys(OPERATOR_LABEL) as Operator[])).map((op) => (
                          <option key={op} value={op}>
                            {OPERATOR_LABEL[op]}
                          </option>
                        ))}
                      </Select>
                      <ValueInput field={field} operator={rule.operator} value={rule.value} onChange={(value) => update(index, { value })} />
                      <Button size="sm" variant="ghost" aria-label={t('admin.removeRule')} onClick={() => remove(index)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    {rowErrors.map((e, i) => (
                      <p key={i} className="mt-1 text-xs text-bad">
                        {e.message}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
            <Button size="sm" variant="ghost" className="mt-1.5" icon={<Plus className="size-4" />} onClick={() => add(groupId)}>
              {t('admin.addRule')}
            </Button>
          </section>
        </div>
      ))}
      <Button variant="secondary" className="mt-4" icon={<Plus className="size-4" />} onClick={() => add(nextGroupId(rules))}>
        {t('admin.addGroup')}
      </Button>
    </div>
  );
}

function ValueInput({ field, operator, value, onChange }: { field?: AdminField; operator: Operator; value: RuleValue; onChange: (v: RuleValue) => void }) {
  const { t } = useTranslation();
  const { l } = useLocalized();
  const label = t('admin.value');

  if (operator === 'in' || operator === 'not_in') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
        {field?.options?.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
              className={cn('rounded-sm border px-2 py-1 text-xs transition-colors', on ? 'border-primary bg-primary text-primary-ink' : 'border-rule hover:border-ink-3')}
            >
              {l(o.label)}
            </button>
          );
        })}
      </div>
    );
  }
  if (field?.type === 'boolean') {
    return (
      <Select aria-label={label} value={String(value)} onChange={(e) => onChange(e.target.value === 'true')}>
        <option value="true">{t('common.yes')}</option>
        <option value="false">{t('common.no')}</option>
      </Select>
    );
  }
  if (field?.type === 'number' || (field?.type === 'range' && operator !== '=' && operator !== '!=')) {
    return (
      <div className="relative">
        {field.type === 'range' && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₹</span>}
        <Input
          aria-label={label}
          type="number"
          className={cn('num', field.type === 'range' && 'pl-7')}
          value={typeof value === 'number' ? value : ''}
          min={field.min}
          max={field.max}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      </div>
    );
  }
  return (
    <Select aria-label={label} value={String(value)} onChange={(e) => onChange(e.target.value)}>
      {field?.options?.map((o) => (
        <option key={o.value} value={o.value}>
          {l(o.label)}
        </option>
      ))}
    </Select>
  );
}
