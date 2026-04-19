import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDataStore } from '@/store/useDataStore';
import type { Character, Outfit } from '@/types';

const sampleCharacter: Character = {
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
  signature_features: ['mole'],
  prohibited: ['tattoo'],
  personality: ['calm'],
  color_palette: { theme: 'warm', colors: ['beige'], usage: 'prompt_inject' },
};

beforeEach(() => {
  localStorage.clear();
  useDataStore.getState().reloadFromStorage();
});

describe('useDataStore', () => {
  it('initial state reads from empty localStorage', () => {
    const { result } = renderHook(() => useDataStore());
    expect(result.current.outfits).toEqual([]);
    expect(result.current.charactersById).toEqual({});
    expect(result.current.activeCharacterId).toBeNull();
  });

  it('importOutfits updates state and writes to localStorage', () => {
    const items: Outfit[] = [{ code: 'O1', name: 'n', prompt: 'p' }];
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.importOutfits(items);
    });
    expect(result.current.outfits).toEqual(items);
    expect(JSON.parse(localStorage.getItem('prompt-tool:data:outfits') ?? '[]')).toEqual(items);
  });

  it('importCharacters replaces the whole map and writes to localStorage', () => {
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.importCharacters({ 'ACC-001': sampleCharacter });
    });
    expect(result.current.charactersById).toEqual({ 'ACC-001': sampleCharacter });
  });

  it('setActiveCharacterId writes to localStorage', () => {
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.setActiveCharacterId('ACC-001');
    });
    expect(result.current.activeCharacterId).toBe('ACC-001');
    expect(localStorage.getItem('prompt-tool:data:activeCharacterId')).toBe('ACC-001');
  });

  it('setActiveCharacterId(null) clears', () => {
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.setActiveCharacterId('ACC-001');
      result.current.setActiveCharacterId(null);
    });
    expect(result.current.activeCharacterId).toBeNull();
    expect(localStorage.getItem('prompt-tool:data:activeCharacterId')).toBeNull();
  });

  it('reloadFromStorage re-reads localStorage into state', () => {
    localStorage.setItem(
      'prompt-tool:data:outfits',
      JSON.stringify([{ code: 'O1', name: 'n', prompt: 'p' }]),
    );
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.reloadFromStorage();
    });
    expect(result.current.outfits).toHaveLength(1);
  });

  it('importScenes updates scenes state', () => {
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.importScenes([
        { code: 'S1', name: 'n', prompt: 'p', lighting_hint: 'l' },
      ]);
    });
    expect(result.current.scenes).toHaveLength(1);
  });

  it('importPoses / importExpressions / importCompositions update their states', () => {
    const { result } = renderHook(() => useDataStore());
    act(() => {
      result.current.importPoses([{ code: 'P1', name: 'n', prompt: 'p', shot_suggestion: ['full_body'] }]);
      result.current.importExpressions([{ code: 'E1', name: 'n', prompt: 'p' }]);
      result.current.importCompositions([{ code: 'C1', name: 'n', prompt: 'p', shot: 'close_up', angle: 'front' }]);
    });
    expect(result.current.poses).toHaveLength(1);
    expect(result.current.expressions).toHaveLength(1);
    expect(result.current.compositions).toHaveLength(1);
  });
});
