import { describe, expect, it } from 'vitest';
import { parseOutfitsCsv } from '@/lib/csv/parseOutfits';

describe('parseOutfitsCsv', () => {
  it('parses a minimal valid CSV', () => {
    const csv = 'code,name,prompt\nCAS-01,咖啡廳穿搭,casual cafe outfit';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toEqual([
        { code: 'CAS-01', name: '咖啡廳穿搭', prompt: 'casual cafe outfit' },
      ]);
    }
  });

  it('parses multiple rows', () => {
    const csv = 'code,name,prompt\nO1,n1,p1\nO2,n2,p2';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(2);
    }
  });

  it('rejects when header column is missing', () => {
    const csv = 'code,name\nO1,n1';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toMatch(/header|欄位/);
    }
  });

  it('rejects when header has extra column', () => {
    const csv = 'code,name,prompt,extra\nO1,n1,p1,x';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('rejects when header order differs from schema', () => {
    const csv = 'name,code,prompt\nn1,O1,p1';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('rejects when required field is empty string', () => {
    const csv = 'code,name,prompt\n,n1,p1';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].line).toBe(2);
      expect(result.errors[0].column).toBe('code');
    }
  });

  it('rejects duplicate code with both line numbers', () => {
    const csv = 'code,name,prompt\nO1,n1,p1\nO2,n2,p2\nO1,n3,p3';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = result.errors[0].message;
      expect(msg).toContain('O1');
      expect(msg).toContain('2');
      expect(msg).toContain('4');
    }
  });

  it('accepts BOM at start of input', () => {
    const csv = '\uFEFFcode,name,prompt\nO1,n1,p1';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(true);
  });

  it('handles quoted fields with commas', () => {
    const csv = 'code,name,prompt\nO1,"a, b",p1';
    const result = parseOutfitsCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].name).toBe('a, b');
    }
  });
});
