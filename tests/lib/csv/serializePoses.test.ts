import { describe, expect, it } from 'vitest';
import { serializePosesCsv } from '@/lib/csv/serializePoses';
import { parsePosesCsv } from '@/lib/csv/parsePoses';
import type { Pose } from '@/types';

describe('serializePosesCsv', () => {
  it('returns BOM + header when empty', () => {
    const csv = serializePosesCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.slice(1).trim()).toBe('code,name,prompt,shot_suggestion');
  });

  it('round-trips single-value shot_suggestion', () => {
    const items: Pose[] = [{ code: 'P1', name: 'n', prompt: 'p', shot_suggestion: ['full_body'] }];
    const parsed = parsePosesCsv(serializePosesCsv(items));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.items).toEqual(items);
  });

  it('round-trips multi-value shot_suggestion with pipe join', () => {
    const items: Pose[] = [
      { code: 'P1', name: 'n', prompt: 'p', shot_suggestion: ['full_body', 'three_quarter_body'] },
    ];
    const csv = serializePosesCsv(items);
    expect(csv).toContain('full_body|three_quarter_body');
    const parsed = parsePosesCsv(csv);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.items).toEqual(items);
  });
});
