import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterPicker } from '@/components/CharacterPicker';
import { useDataStore } from '@/store/useDataStore';
import type { Character } from '@/types';

const sampleA: Character = {
  character_id: 'ACC-001',
  display_name: '角色 A',
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
};
const sampleB: Character = { ...sampleA, character_id: 'ACC-002', display_name: '角色 B' };

beforeEach(() => {
  localStorage.clear();
  act(() => {
    useDataStore.setState({
      charactersById: {},
      activeCharacterId: null,
    });
  });
});

describe('CharacterPicker', () => {
  it('shows empty-state prompt when charactersById is empty', () => {
    render(<CharacterPicker />);
    expect(screen.getByText(/尚未匯入角色/)).toBeInTheDocument();
  });

  it('renders character options by display_name when data exists', async () => {
    act(() => {
      useDataStore.setState({
        charactersById: { 'ACC-001': sampleA, 'ACC-002': sampleB },
        activeCharacterId: 'ACC-001',
      });
    });
    render(<CharacterPicker />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    expect(await screen.findAllByText('角色 A')).not.toHaveLength(0);
    expect(screen.getAllByText('角色 B')).not.toHaveLength(0);
  });

  it('calls setActiveCharacterId when user picks another character', async () => {
    act(() => {
      useDataStore.setState({
        charactersById: { 'ACC-001': sampleA, 'ACC-002': sampleB },
        activeCharacterId: 'ACC-001',
      });
    });
    const setSpy = vi.spyOn(useDataStore.getState(), 'setActiveCharacterId');
    render(<CharacterPicker />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('角色 B'));
    expect(setSpy).toHaveBeenCalledWith('ACC-002');
  });

  it('auto-fallbacks to first character when activeCharacterId points to missing', () => {
    const setSpy = vi.fn();
    act(() => {
      useDataStore.setState({
        charactersById: { 'ACC-001': sampleA, 'ACC-002': sampleB },
        activeCharacterId: 'ACC-999',
        setActiveCharacterId: setSpy,
      });
    });
    render(<CharacterPicker />);
    expect(setSpy).toHaveBeenCalledWith('ACC-001');
  });

  it('auto-fallbacks to first character when activeCharacterId is null but data exists', () => {
    const setSpy = vi.fn();
    act(() => {
      useDataStore.setState({
        charactersById: { 'ACC-001': sampleA },
        activeCharacterId: null,
        setActiveCharacterId: setSpy,
      });
    });
    render(<CharacterPicker />);
    expect(setSpy).toHaveBeenCalledWith('ACC-001');
  });
});
