import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import type { Question } from '../../lib/types';
import { QuestionField } from './QuestionField';

const occupation: Question = {
  key: 'occupation',
  type: 'enum',
  required: false,
  label: { en: 'What do you mainly do?', hi: 'आप मुख्य रूप से क्या करते हैं?' },
  options: [
    { value: 'farmer', label: { en: 'Farmer', hi: 'किसान' } },
    { value: 'student', label: { en: 'Student', hi: 'विद्यार्थी' } },
  ],
};

describe('<QuestionField>', () => {
  it('renders option tiles as an accessible radio group and reports selection', async () => {
    const onChange = vi.fn();
    render(<QuestionField question={occupation} value={undefined} onChange={onChange} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Farmer/ }));
    expect(onChange).toHaveBeenCalledWith('farmer');
  });

  it('marks the selected option', () => {
    render(<QuestionField question={occupation} value="student" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /Student/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('switches to Hindi labels', async () => {
    await i18n.changeLanguage('hi');
    render(<QuestionField question={occupation} value={undefined} onChange={() => {}} />);
    expect(screen.getByText('किसान')).toBeInTheDocument();
    expect(screen.getByText('वैकल्पिक')).toBeInTheDocument();
    await i18n.changeLanguage('en');
  });

  it('renders yes/no for booleans and a clear button once answered', async () => {
    const onChange = vi.fn();
    render(<QuestionField question={{ key: 'bplCard', type: 'boolean', required: false, label: { en: 'BPL?', hi: 'बीपीएल?' } }} value={false} onChange={onChange} />);
    expect(screen.getByRole('radio', { name: /No/ })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('number stepper strips non-digits and clamps with +/-', async () => {
    const onChange = vi.fn();
    render(<QuestionField question={{ key: 'age', type: 'number', required: true, min: 0, max: 120, label: { en: 'Age', hi: 'उम्र' } }} value={120} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Increase' }));
    expect(onChange).toHaveBeenLastCalledWith(120);
    expect(screen.getByRole('textbox')).toHaveValue('120');
  });
});
