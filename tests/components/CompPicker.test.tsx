import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompPicker } from '@/components/CompPicker';
import type { Composition } from '@/types';

const comps: Composition[] = [
  {
    code: 'COMP-01',
    name: '特寫正面',
    prompt: 'close-up headshot, front view',
    shot: 'close_up',
    angle: 'front',
  },
  {
    code: 'COMP-04',
    name: '全身 3/4',
    prompt: 'full-body shot, 3/4 angle',
    shot: 'full_body',
    angle: 'three_quarter',
  },
];

describe('CompPicker', () => {
  describe('Given 2 recommended comps and 1 pre-selected', () => {
    describe('When rendered', () => {
      it('Then shows 2 checkboxes with the pre-selected one checked', () => {
        render(<CompPicker recommended={comps} selected={['COMP-01']} onToggle={vi.fn()} />);
        const cb1 = screen.getByRole('checkbox', { name: /COMP-01/ });
        const cb2 = screen.getByRole('checkbox', { name: /COMP-04/ });
        expect(cb1).toBeChecked();
        expect(cb2).not.toBeChecked();
      });
    });

    describe('When the unchecked checkbox is clicked', () => {
      it('Then onToggle is called with its code', async () => {
        const user = userEvent.setup();
        const onToggle = vi.fn();
        render(<CompPicker recommended={comps} selected={['COMP-01']} onToggle={onToggle} />);
        await user.click(screen.getByRole('checkbox', { name: /COMP-04/ }));
        expect(onToggle).toHaveBeenCalledWith('COMP-04');
      });
    });
  });

  describe('Given two CompPickers sharing a comp code', () => {
    describe('When clicking the second picker label', () => {
      it('Then only the second onToggle fires (no cross-picker leak)', async () => {
        const user = userEvent.setup();
        const onToggleA = vi.fn();
        const onToggleB = vi.fn();
        render(
          <>
            <div data-testid="picker-a">
              <CompPicker recommended={comps} selected={[]} onToggle={onToggleA} />
            </div>
            <div data-testid="picker-b">
              <CompPicker recommended={comps} selected={[]} onToggle={onToggleB} />
            </div>
          </>,
        );

        const pickerB = screen.getByTestId('picker-b');
        const labelB = pickerB.querySelector('label:has(input[aria-label^="COMP-01"])') as HTMLLabelElement;
        await user.click(labelB);

        expect(onToggleB).toHaveBeenCalledWith('COMP-01');
        expect(onToggleA).not.toHaveBeenCalled();
      });
    });
  });
});
