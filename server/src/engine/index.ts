/**
 * Rules engine public API. Pure functions only — no database or HTTP —
 * so it is trivially unit-testable (see tests/unit).
 */
export * from './types.js';
export * from './fields.js';
export * from './states.js';
export { evaluateRule, compare } from './operators.js';
export { evaluateScheme, groupRules } from './evaluate.js';
export { relevanceScore, rank, deadlineUrgency } from './rank.js';
export { validateRule, validateRules, valueTypeOf } from './validate.js';
export { formatRupees, formatValue } from './explain.js';
