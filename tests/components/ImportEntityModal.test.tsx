import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportEntityModal } from '@/components/ImportEntityModal';
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

describe('ImportEntityModal', () => {
  it('renders title and schema hint matching entity kind', () => {
    render(<ImportEntityModal entityKind="outfits" open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/匯入\s*Outfits/)).toBeInTheDocument();
    expect(screen.getByText(/3 個欄位皆為字串/)).toBeInTheDocument();
  });

  it('pastes valid CSV and imports when no existing data (no confirm dialog)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ImportEntityModal entityKind="outfits" open={true} onClose={onClose} />);
    await user.type(
      screen.getByLabelText('貼上內容'),
      'code,name,prompt\nO1,n1,p1',
    );
    await user.click(screen.getByRole('button', { name: '匯入' }));
    await waitFor(() => {
      expect(useDataStore.getState().outfits).toEqual([
        { code: 'O1', name: 'n1', prompt: 'p1' },
      ]);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows ConfirmDialog when existing data exists; cancel → no save', async () => {
    act(() => {
      useDataStore.setState({
        outfits: [{ code: 'O0', name: 'existing', prompt: 'p' }],
      });
    });
    const user = userEvent.setup();
    render(<ImportEntityModal entityKind="outfits" open={true} onClose={vi.fn()} />);
    await user.type(
      screen.getByLabelText('貼上內容'),
      'code,name,prompt\nO1,n1,p1',
    );
    await user.click(screen.getByRole('button', { name: '匯入' }));
    expect(await screen.findByText(/將取代既有 1 筆 Outfits/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(useDataStore.getState().outfits).toEqual([
      { code: 'O0', name: 'existing', prompt: 'p' },
    ]);
  });

  it('ConfirmDialog confirm → replaces and closes', async () => {
    act(() => {
      useDataStore.setState({
        outfits: [{ code: 'O0', name: 'existing', prompt: 'p' }],
      });
    });
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ImportEntityModal entityKind="outfits" open={true} onClose={onClose} />);
    await user.type(
      screen.getByLabelText('貼上內容'),
      'code,name,prompt\nO1,n1,p1',
    );
    await user.click(screen.getByRole('button', { name: '匯入' }));
    const confirmBtn = await screen.findByRole('button', { name: '確認' });
    await user.click(confirmBtn);
    await waitFor(() => {
      expect(useDataStore.getState().outfits).toEqual([
        { code: 'O1', name: 'n1', prompt: 'p1' },
      ]);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error list when parse fails and does not write to store', async () => {
    const user = userEvent.setup();
    render(<ImportEntityModal entityKind="outfits" open={true} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText('貼上內容'), 'bad,csv,content\nA,B');
    await user.click(screen.getByRole('button', { name: '匯入' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(useDataStore.getState().outfits).toEqual([]);
  });

  it('accepts character JSON when entityKind is characters', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ImportEntityModal entityKind="characters" open={true} onClose={onClose} />);
    const json = JSON.stringify({
      character_id: 'ACC-001',
      display_name: 'Test',
      model: { base: 'b', lora: 'l', lora_weight_range: [0.7, 1.0], trigger_word: 't' },
      appearance: {
        face_type: 'oval',
        eye: 'brown',
        hair_default: 'black',
        hair_variations: ['bob'],
        skin_tone: 'fair',
        skin_hex: '#FFDDCC',
        body: 'slim',
        age_range: [20, 25],
      },
      signature_features: ['f'],
      prohibited: ['p'],
      personality: ['calm'],
      color_palette: { theme: 'warm', colors: ['beige'], usage: 'prompt_inject' },
    });
    const textarea = screen.getByLabelText('貼上內容');
    await user.click(textarea);
    await user.paste(json);
    await user.click(screen.getByRole('button', { name: '匯入' }));
    await waitFor(() => {
      expect(Object.keys(useDataStore.getState().charactersById)).toEqual(['ACC-001']);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(
      <ImportEntityModal entityKind="outfits" open={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
