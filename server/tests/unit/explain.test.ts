import { describe, expect, it } from 'vitest';
import { formatRupees, formatValue } from '../../src/engine/explain.js';
import { getField } from '../../src/engine/fields.js';
import { splitRuns } from '../../src/modules/checklist/pdf.js';

describe('formatRupees()', () => {
  it('uses Indian units', () => {
    expect(formatRupees(250_000, 'en')).toBe('₹2.5 lakh');
    expect(formatRupees(250_000, 'hi')).toBe('₹2.5 लाख');
    expect(formatRupees(15_000, 'en')).toBe('₹15,000');
    expect(formatRupees(56_460, 'en')).toBe('₹56,460');
    expect(formatRupees(999, 'en')).toBe('₹999');
    expect(formatRupees(12_500_000, 'en')).toBe('₹1.25 crore');
  });
});

describe('formatValue()', () => {
  it('shows option labels and yes/no', () => {
    expect(formatValue(getField('occupation'), 'farmer', 'hi')).toBe('किसान');
    expect(formatValue(getField('bplCard'), false, 'en')).toBe('No');
    expect(formatValue(getField('category'), ['sc', 'st'], 'en')).toBe('Scheduled Caste (SC), Scheduled Tribe (ST)');
  });
});

describe('PDF splitRuns()', () => {
  it('separates Devanagari from Latin and keeps punctuation in Latin runs', () => {
    expect(splitRuns('आधार कार्ड (ई-केवाईसी)')).toEqual([
      [true, 'आधार कार्ड '],
      [false, '('],
      [true, 'ई'],
      [false, '-'],
      [true, 'केवाईसी'],
      [false, ')'],
    ]);
  });
});
