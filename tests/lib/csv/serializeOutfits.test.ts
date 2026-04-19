import { describe, expect, it } from 'vitest';
import { serializeOutfitsCsv } from '@/lib/csv/serializeOutfits';
import { parseOutfitsCsv } from '@/lib/csv/parseOutfits';
import type { Outfit } from '@/types';

describe('serializeOutfitsCsv', () => {
  it('returns BOM + header only when items is empty', () => {
    const csv = serializeOutfitsCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.slice(1).trim()).toBe('code,name,prompt');
  });

  it('round-trips: serialize → parse returns equivalent items', () => {
    const items: Outfit[] = [
      { code: 'O1', name: 'name with, comma', prompt: 'prompt "with quotes"' },
      { code: 'O2', name: 'n2', prompt: 'p2' },
    ];
    const csv = serializeOutfitsCsv(items);
    const parsed = parseOutfitsCsv(csv);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.items).toEqual(items);
    }
  });

  it('round-trip cleans up whitespace-padded input values from parser side', () => {
    const items = [{ code: 'O1', name: 'n1', prompt: 'p1' }];
    const csv = serializeOutfitsCsv(items);
    const parsed = parseOutfitsCsv(csv);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.items).toEqual(items);
  });
});
