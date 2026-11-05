/**
 * Rule validator (FR-18).
 *
 * Checks that every rule refers to a known field, uses an operator allowed
 * for that field's type, and carries a value of the right type/option.
 * Used by the admin API before saving and by the admin UI's "Validate" button.
 */
import { getField, type FieldType } from './fields.js';
import { OPERATORS, type Operator, type Rule, type ValueType } from './types.js';

export interface RuleError {
  index: number;
  message: string;
}

const ALLOWED: Record<FieldType, Operator[]> = {
  enum: ['=', '!=', 'in', 'not_in'],
  boolean: ['=', '!='],
  number: ['=', '!=', '<', '<=', '>', '>='],
  range: ['<', '<=', '>', '>=', '=', '!=', 'in', 'not_in'],
};

export function valueTypeOf(value: unknown): ValueType {
  if (Array.isArray(value)) return 'string[]';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

export function validateRule(rule: Partial<Rule>, index = 0): RuleError[] {
  const errors: RuleError[] = [];
  const err = (message: string) => errors.push({ index, message });

  if (!Number.isInteger(rule.groupId) || (rule.groupId as number) < 1) err('Group must be a positive whole number');
  const field = rule.field ? getField(rule.field) : undefined;
  if (!field) {
    err(`Unknown field "${rule.field ?? ''}"`);
    return errors;
  }
  if (!rule.operator || !OPERATORS.includes(rule.operator)) {
    err(`Unknown operator "${rule.operator ?? ''}"`);
    return errors;
  }
  if (!ALLOWED[field.type].includes(rule.operator)) {
    err(`Operator "${rule.operator}" is not allowed for ${field.type} field "${field.key}"`);
    return errors;
  }

  const value = rule.value;
  const optionValues = new Set(field.options?.map((o) => o.value) ?? []);
  const isList = rule.operator === 'in' || rule.operator === 'not_in';

  if (isList) {
    if (!Array.isArray(value) || value.length === 0) err('Value must be a non-empty list of options');
    else {
      const bad = value.filter((v) => !optionValues.has(v));
      if (bad.length) err(`Invalid option(s) for "${field.key}": ${bad.join(', ')}`);
    }
    return errors;
  }

  switch (field.type) {
    case 'boolean':
      if (typeof value !== 'boolean') err('Value must be true or false');
      break;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) err('Value must be a number');
      else if ((field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max))
        err(`Value must be between ${field.min} and ${field.max}`);
      break;
    case 'range':
      if (rule.operator === '=' || rule.operator === '!=') {
        if (typeof value !== 'string' || !optionValues.has(value)) err(`Value must be one of: ${[...optionValues].join(', ')}`);
      } else if (typeof value !== 'number' || value < 0) err('Value must be a non-negative number (e.g. 250000)');
      break;
    case 'enum':
      if (typeof value !== 'string' || !optionValues.has(value)) err(`Invalid option "${String(value)}" for "${field.key}"`);
      break;
  }
  return errors;
}

export function validateRules(rules: Partial<Rule>[]): RuleError[] {
  return rules.flatMap((rule, i) => validateRule(rule, i));
}
