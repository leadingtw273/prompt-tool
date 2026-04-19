import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
      options={comps}
      recommendedCodes={[]}
      selected={selected}
      onChange={(codes) => {
        setSelected(codes);
        onChangeSpy(codes);
      }}
    />
  );
}

describe('CompPicker', () => {
  it('renders pre-selected comps as tags using Chinese names only', () => {
    render(<CompPicker options={comps} recommendedCodes={[]} selected={['COMP-01']} onChange={vi.fn()} />);
    expect(screen.getByText('特寫正面')).toBeInTheDocument();
    expect(screen.queryByText('COMP-01')).not.toBeInTheDocument();
    expect(screen.queryByText('COMP-04')).not.toBeInTheDocument();
  });

  it('opens the menu and shows each option labelled by Chinese name only', async () => {
    const user = userEvent.setup();
    render(<CompPicker options={comps} recommendedCodes={[]} selected={[]} onChange={vi.fn()} />);
    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['特寫正面', '全身 3/4']);
  });

  it('calls onChange with the selected code when an option is picked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CompPicker options={comps} recommendedCodes={[]} selected={[]} onChange={onChange} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('全身 3/4'));
    expect(onChange).toHaveBeenLastCalledWith(['COMP-04']);
  });

  it('accumulates multiple selections when the parent retains state', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<ControlledPicker initial={[]} onChangeSpy={onChangeSpy} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('特寫正面'));
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('全身 3/4'));
    const lastCall = onChangeSpy.mock.calls.at(-1)?.[0] as string[];
    expect(lastCall).toContain('COMP-01');
    expect(lastCall).toContain('COMP-04');
  });

  it('renders recommended options before non-recommended in dropdown order', async () => {
    const user = userEvent.setup();
    render(
      <CompPicker
        options={comps}
        recommendedCodes={['COMP-04']}
        selected={[]}
        onChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    const optionEls = within(listbox).getAllByRole('option');
    expect(optionEls.map((o) => o.textContent)).toEqual(['⭐ 全身 3/4', '特寫正面']);
  });

  it('renders a ⭐ prefix on options listed in recommendedCodes', async () => {
    const user = userEvent.setup();
    render(
      <CompPicker
        options={comps}
        recommendedCodes={['COMP-04']}
        selected={[]}
        onChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText(/^⭐ 全身 3\/4$/)).toBeInTheDocument();
  });

  it('applies text-blue-400 class to recommended options', async () => {
    const user = userEvent.setup();
    render(
      <CompPicker
        options={comps}
        recommendedCodes={['COMP-04']}
        selected={[]}
        onChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText(/^⭐ 全身 3\/4$/)).toHaveClass('text-blue-400');
  });

  it('does not render ⭐ or text-blue-400 on non-recommended options', async () => {
    const user = userEvent.setup();
    render(
      <CompPicker
        options={comps}
        recommendedCodes={['COMP-04']}
        selected={[]}
        onChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    const plainOption = within(listbox).getByText(/^特寫正面$/);
    expect(plainOption).toBeInTheDocument();
    expect(plainOption).not.toHaveClass('text-blue-400');
    expect(within(listbox).queryByText(/^⭐ 特寫正面$/)).not.toBeInTheDocument();
  });

  it('shows ⭐ on a chip when the selected comp is recommended', () => {
    render(
      <CompPicker
        options={comps}
        recommendedCodes={['COMP-04']}
        selected={['COMP-04']}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/^⭐ 全身 3\/4$/)).toHaveClass('text-blue-400');
  });

  it('does not show ⭐ on a chip when the selected comp is not recommended', () => {
    render(
      <CompPicker
        options={comps}
        recommendedCodes={['COMP-04']}
        selected={['COMP-01']}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/^特寫正面$/)).toBeInTheDocument();
    expect(screen.queryByText(/^⭐ 特寫正面$/)).not.toBeInTheDocument();
  });
});
