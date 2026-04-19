import { describe, expect, it } from 'vitest';
import { parseExpressionsCsv } from '@/lib/csv/parseExpressions';

describe('parseExpressionsCsv', () => {
  it('parses valid CSV', () => {
    const csv = 'code,name,prompt\nEXP-01,微笑,gentle smile';
    const result = parseExpressionsCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toEqual([{ code: 'EXP-01', name: '微笑', prompt: 'gentle smile' }]);
    }
  });

  it('rejects column mismatch', () => {
    const csv = 'code,name\nE1,n';
    expect(parseExpressionsCsv(csv).ok).toBe(false);
  });

  it('rejects empty prompt', () => {
    const csv = 'code,name,prompt\nE1,n,';
    expect(parseExpressionsCsv(csv).ok).toBe(false);
  });

  it('rejects duplicate code', () => {
    const csv = 'code,name,prompt\nE1,n,p\nE1,n2,p2';
    expect(parseExpressionsCsv(csv).ok).toBe(false);
  });

  it('parses multiple rows', () => {
    const csv = 'code,name,prompt\nE1,n1,p1\nE2,n2,p2';
    const result = parseExpressionsCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toHaveLength(2);
  });

  it('accepts BOM', () => {
    expect(parseExpressionsCsv('\uFEFFcode,name,prompt\nE1,n,p').ok).toBe(true);
  });

  it('rejects whitespace-only required field', () => {
    const csv = 'code,name,prompt\nE1,   ,p';
    const result = parseExpressionsCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.column === 'name')).toBe(true);
    }
  });
});
