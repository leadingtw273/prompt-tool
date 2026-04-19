import { describe, expect, it } from 'vitest';
import { serializeScenesCsv } from '@/lib/csv/serializeScenes';
import { parseScenesCsv } from '@/lib/csv/parseScenes';
import type { Scene } from '@/types';

describe('serializeScenesCsv', () => {
  it('returns BOM + header when empty', () => {
    const csv = serializeScenesCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.slice(1).trim()).toBe('code,name,prompt,lighting_hint');
  });

  it('round-trips', () => {
    const items: Scene[] = [{ code: 'S1', name: 'n', prompt: 'p', lighting_hint: 'l' }];
    const parsed = parseScenesCsv(serializeScenesCsv(items));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.items).toEqual(items);
  });
});
