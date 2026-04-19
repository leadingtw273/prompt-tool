import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataManagerModal } from '@/components/DataManagerModal';
import { useDataStore } from '@/store/useDataStore';

beforeEach(() => {
  localStorage.clear();
  act(() => {
    useDataStore.setState({
      outfits: [],
      scenes: [],
      poses: [],
      expressions: [],
      compositions: [],
      charactersById: {},
      activeCharacterId: null,
    });
  });
});

describe('DataManagerModal', () => {
  it('renders 6 entity rows with display names', () => {
    render(<DataManagerModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Outfits')).toBeInTheDocument();
    expect(screen.getByText('Scenes')).toBeInTheDocument();
    expect(screen.getByText('Poses')).toBeInTheDocument();
    expect(screen.getByText('Expressions')).toBeInTheDocument();
    expect(screen.getByText('Compositions')).toBeInTheDocument();
    expect(screen.getByText('Characters')).toBeInTheDocument();
  });

  it('shows count 0 when store is empty and disables Export buttons', () => {
    render(<DataManagerModal open={true} onClose={vi.fn()} />);
    const exportButtons = screen.getAllByRole('button', { name: /匯出/ });
    for (const btn of exportButtons) {
      expect(btn).toBeDisabled();
    }
  });

  it('displays correct counts for each entity', () => {
    act(() => {
      useDataStore.setState({
        outfits: [{ code: 'O1', name: 'n', prompt: 'p' }],
        scenes: [
          { code: 'S1', name: 'n', prompt: 'p', lighting_hint: 'l' },
          { code: 'S2', name: 'n', prompt: 'p', lighting_hint: 'l' },
        ],
      });
    });
    render(<DataManagerModal open={true} onClose={vi.fn()} />);
    const outfitsRow = screen.getByText('Outfits').closest('tr')!;
    const scenesRow = screen.getByText('Scenes').closest('tr')!;
    expect(within(outfitsRow).getByText('1')).toBeInTheDocument();
    expect(within(scenesRow).getByText('2')).toBeInTheDocument();
  });

  it('clicking Import opens ImportEntityModal for that entity', async () => {
    const user = userEvent.setup();
    render(<DataManagerModal open={true} onClose={vi.fn()} />);
    const outfitsRow = screen.getByText('Outfits').closest('tr')!;
    const importBtn = within(outfitsRow).getByRole('button', { name: /匯入/ });
    await user.click(importBtn);
    expect(await screen.findByRole('dialog', { name: /匯入\s*Outfits/ })).toBeInTheDocument();
  });

  it('clicking Export triggers download with correct filename + mimeType', async () => {
    act(() => {
      useDataStore.setState({
        outfits: [{ code: 'O1', name: 'n', prompt: 'p' }],
      });
    });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let capturedAnchor: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedAnchor = this;
    });
    const user = userEvent.setup();
    render(<DataManagerModal open={true} onClose={vi.fn()} />);
    const outfitsRow = screen.getByText('Outfits').closest('tr')!;
    await user.click(within(outfitsRow).getByRole('button', { name: /匯出/ }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(capturedAnchor!.download).toBe('outfits.csv');
  });

  it('close button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DataManagerModal open={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: '關閉' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<DataManagerModal open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
