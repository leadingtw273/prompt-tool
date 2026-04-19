import { describe, expect, it } from 'vitest';
import { serializeExpressionsCsv } from '@/lib/csv/serializeExpressions';
import { parseExpressionsCsv } from '@/lib/csv/parseExpressions';
import type { Expression } from '@/types';

describe('serializeExpressionsCsv', () => {
  it('returns BOM + header when empty', () => {
    const csv = serializeExpressionsCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.slice(1).trim()).toBe('code,name,prompt');
  });

  it('round-trips', () => {
    const items: Expression[] = [{ code: 'E1', name: 'n', prompt: 'p' }];
    const parsed = parseExpressionsCsv(serializeExpressionsCsv(items));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.items).toEqual(items);
  });
});
