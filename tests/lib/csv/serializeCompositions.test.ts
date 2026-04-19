import { describe, expect, it } from 'vitest';
import { serializeCompositionsCsv } from '@/lib/csv/serializeCompositions';
import { parseCompositionsCsv } from '@/lib/csv/parseCompositions';
import type { Composition } from '@/types';

describe('serializeCompositionsCsv', () => {
  it('returns BOM + header when empty', () => {
    const csv = serializeCompositionsCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.slice(1).trim()).toBe('code,name,prompt,shot,angle');
  });

  it('round-trips', () => {
    const items: Composition[] = [
      { code: 'C1', name: 'n', prompt: 'p', shot: 'full_body', angle: 'low_up' },
    ];
    const parsed = parseCompositionsCsv(serializeCompositionsCsv(items));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.items).toEqual(items);
  });
});
