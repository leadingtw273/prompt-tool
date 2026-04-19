import { describe, expect, it } from 'vitest';
import { parseCharactersJson } from '@/lib/characters/parseCharacter';

const valid = {
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

describe('parseCharactersJson', () => {
  it('accepts a single character object and wraps into map', () => {
    const result = parseCharactersJson(JSON.stringify(valid));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ 'ACC-001': valid });
    }
  });

  it('accepts a map of characters', () => {
    const input = { 'ACC-001': valid, 'ACC-002': { ...valid, character_id: 'ACC-002' } };
    const result = parseCharactersJson(JSON.stringify(input));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.value)).toHaveLength(2);
    }
  });

  it('rejects non-JSON input', () => {
    const result = parseCharactersJson('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toMatch(/JSON/i);
    }
  });

  it('rejects missing character_id', () => {
    const { character_id, ...rest } = valid;
    const result = parseCharactersJson(JSON.stringify(rest));
    expect(result.ok).toBe(false);
  });

  it('rejects missing appearance.eye', () => {
    const clone = JSON.parse(JSON.stringify(valid));
    delete clone.appearance.eye;
    const result = parseCharactersJson(JSON.stringify(clone));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toContain('appearance.eye');
    }
  });

  it('rejects age_range of wrong length', () => {
    const clone = JSON.parse(JSON.stringify(valid));
    clone.appearance.age_range = [20];
    const result = parseCharactersJson(JSON.stringify(clone));
    expect(result.ok).toBe(false);
  });

  it('rejects lora_weight_range of wrong length', () => {
    const clone = JSON.parse(JSON.stringify(valid));
    clone.model.lora_weight_range = [0.7, 1.0, 1.2];
    const result = parseCharactersJson(JSON.stringify(clone));
    expect(result.ok).toBe(false);
  });

  it('rejects signature_features that is not an array', () => {
    const clone = JSON.parse(JSON.stringify(valid));
    clone.signature_features = 'mole';
    const result = parseCharactersJson(JSON.stringify(clone));
    expect(result.ok).toBe(false);
  });

  it('rejects color_palette.usage outside the union', () => {
    const clone = JSON.parse(JSON.stringify(valid));
    clone.color_palette.usage = 'wallpaper';
    const result = parseCharactersJson(JSON.stringify(clone));
    expect(result.ok).toBe(false);
  });

  it('rejects map entry that is invalid (whole batch fails)', () => {
    const badClone = JSON.parse(JSON.stringify(valid));
    delete badClone.display_name;
    const input = { 'ACC-001': valid, 'ACC-002': badClone };
    const result = parseCharactersJson(JSON.stringify(input));
    expect(result.ok).toBe(false);
  });
});
