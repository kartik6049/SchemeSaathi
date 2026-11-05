/**
 * Profile validation for POST /api/match, generated from the field registry
 * so a new field only needs to be added in one place.
 * Every field is optional (skipped = unknown); `null` and "" also mean skipped.
 * Unknown keys are silently dropped.
 */
import { z } from 'zod';
import { FIELDS, type FieldDef } from '../../engine/fields.js';
import type { Profile } from '../../engine/types.js';

const skipped = (v: unknown) => (v === null || v === '' ? undefined : v);

function fieldSchema(f: FieldDef): z.ZodTypeAny {
  switch (f.type) {
    case 'number':
      return z.number().int().min(f.min ?? 0).max(f.max ?? Number.MAX_SAFE_INTEGER);
    case 'boolean':
      return z.boolean();
    case 'enum':
    case 'range': {
      const values = f.options!.map((o) => o.value) as [string, ...string[]];
      return z.enum(values);
    }
  }
}

// Built dynamically from the registry, so zod can't infer field types;
// each field schema only admits string | number | boolean, hence the Profile type.
export const profileSchema = z.object(
  Object.fromEntries(FIELDS.map((f) => [f.key, z.preprocess(skipped, fieldSchema(f).optional())])),
) as unknown as z.ZodType<Profile>;
