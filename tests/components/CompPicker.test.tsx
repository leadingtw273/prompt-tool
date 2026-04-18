import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompPicker } from '@/components/CompPicker';
import type { Composition } from '@/types';

function ControlledPicker({
  initial,
  onChangeSpy,
}: {
  initial: string[];
  onChangeSpy: (codes: string[]) => void;
}) {
  const [selected, setSelected] = useState(initial);
  return (
    <CompPicker
      recommended={comps}
      selected={selected}
      onChange={(codes) => {
        setSelected(codes);
        onChangeSpy(codes);
      }}
    />
  );
}

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
  it('renders each recommended comp as an option displaying only the Chinese name', () => {
    render(<CompPicker recommended={comps} selected={[]} onChange={vi.fn()} />);
    const select = screen.getByRole('listbox', { name: '構圖挑選' });
    expect(select).toHaveAttribute('multiple');
    expect(screen.getByRole('option', { name: '特寫正面' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '全身 3/4' })).toBeInTheDocument();
    expect(screen.queryByText(/COMP-01/)).not.toBeInTheDocument();
    expect(screen.queryByText(/COMP-04/)).not.toBeInTheDocument();
  });

  it('marks pre-selected options as selected', () => {
    render(<CompPicker recommended={comps} selected={['COMP-01']} onChange={vi.fn()} />);
    const optSelected = screen.getByRole('option', { name: '特寫正面' }) as HTMLOptionElement;
    const optUnselected = screen.getByRole('option', { name: '全身 3/4' }) as HTMLOptionElement;
    expect(optSelected.selected).toBe(true);
    expect(optUnselected.selected).toBe(false);
  });

  it('calls onChange with the array of selected codes when selection changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CompPicker recommended={comps} selected={[]} onChange={onChange} />);
    const select = screen.getByRole('listbox', { name: '構圖挑選' });
    await user.selectOptions(select, ['COMP-04']);
    expect(onChange).toHaveBeenLastCalledWith(['COMP-04']);
  });

  it('accumulates multiple selections when the parent retains state', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<ControlledPicker initial={[]} onChangeSpy={onChangeSpy} />);
    const select = screen.getByRole('listbox', { name: '構圖挑選' });
    await user.selectOptions(select, ['COMP-01', 'COMP-04']);
    const lastCall = onChangeSpy.mock.calls.at(-1)?.[0] as string[];
    expect(lastCall).toContain('COMP-01');
    expect(lastCall).toContain('COMP-04');
  });
});
