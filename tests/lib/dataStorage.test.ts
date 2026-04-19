import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character, Outfit, Scene, Pose, Expression, Composition } from '@/types';
import {
  StorageError,
  loadOutfits,
  saveOutfits,
  loadScenes,
  saveScenes,
  loadPoses,
  savePoses,
  loadExpressions,
  saveExpressions,
  loadCompositions,
  saveCompositions,
  loadCharacters,
  saveCharacters,
  loadActiveCharacterId,
  saveActiveCharacterId,
} from '@/lib/dataStorage';

beforeEach(() => {
  localStorage.clear();
});

describe('dataStorage', () => {
  it('loadOutfits returns [] when key missing', () => {
    expect(loadOutfits()).toEqual([]);
  });

  it('loadOutfits round-trip via saveOutfits', () => {
    const items: Outfit[] = [{ code: 'O1', name: 'o1', prompt: 'p' }];
    saveOutfits(items);
    expect(loadOutfits()).toEqual(items);
  });

  it('loadOutfits returns [] when JSON is corrupt', () => {
    localStorage.setItem('prompt-tool:data:outfits', '{not json');
    expect(loadOutfits()).toEqual([]);
  });

  it('loadOutfits returns [] when stored value is not an array', () => {
    localStorage.setItem('prompt-tool:data:outfits', '{"a":1}');
    expect(loadOutfits()).toEqual([]);
  });

  it('saveOutfits throws StorageError when quota exceeds', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => saveOutfits([])).toThrow(StorageError);
    setItemSpy.mockRestore();
  });

  it('loadScenes / saveScenes round-trip', () => {
    const items: Scene[] = [{ code: 'S1', name: 's1', prompt: 'p', lighting_hint: 'h' }];
    saveScenes(items);
    expect(loadScenes()).toEqual(items);
  });

  it('loadPoses / savePoses round-trip preserves shot_suggestion array', () => {
    const items: Pose[] = [{ code: 'P1', name: 'p1', prompt: 'x', shot_suggestion: ['full_body', 'medium'] }];
    savePoses(items);
    expect(loadPoses()).toEqual(items);
  });

  it('loadExpressions / saveExpressions round-trip', () => {
    const items: Expression[] = [{ code: 'E1', name: 'e1', prompt: 'p' }];
    saveExpressions(items);
    expect(loadExpressions()).toEqual(items);
  });

  it('loadCompositions / saveCompositions round-trip', () => {
    const items: Composition[] = [
      { code: 'C1', name: 'c1', prompt: 'p', shot: 'close_up', angle: 'front' },
    ];
    saveCompositions(items);
    expect(loadCompositions()).toEqual(items);
  });

  it('loadCharacters returns {} when key missing', () => {
    expect(loadCharacters()).toEqual({});
  });

  it('loadCharacters / saveCharacters round-trip', () => {
    const map: Record<string, Character> = {
      'ACC-001': {
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
      },
    };
    saveCharacters(map);
    expect(loadCharacters()).toEqual(map);
  });

  it('loadActiveCharacterId returns null when key missing', () => {
    expect(loadActiveCharacterId()).toBeNull();
  });

  it('loadActiveCharacterId / saveActiveCharacterId round-trip', () => {
    saveActiveCharacterId('ACC-001');
    expect(loadActiveCharacterId()).toBe('ACC-001');
  });

  it('saveActiveCharacterId(null) clears the key', () => {
    saveActiveCharacterId('ACC-001');
    saveActiveCharacterId(null);
    expect(loadActiveCharacterId()).toBeNull();
  });
});
