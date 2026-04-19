import { describe, expect, it } from 'vitest';
import { parseScenesCsv } from '@/lib/csv/parseScenes';

describe('parseScenesCsv', () => {
  it('parses a minimal valid CSV', () => {
    const csv = 'code,name,prompt,lighting_hint\nSCN-01,咖啡廳,cozy cafe,warm side lighting';
    const result = parseScenesCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toEqual([
        { code: 'SCN-01', name: '咖啡廳', prompt: 'cozy cafe', lighting_hint: 'warm side lighting' },
      ]);
    }
  });

  it('rejects when lighting_hint is empty', () => {
    const csv = 'code,name,prompt,lighting_hint\nSCN-01,n,p,';
    const result = parseScenesCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].column).toBe('lighting_hint');
    }
  });

  it('rejects when column missing', () => {
    const csv = 'code,name,prompt\nSCN-01,n,p';
    const result = parseScenesCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('rejects duplicate code', () => {
    const csv = 'code,name,prompt,lighting_hint\nS1,n,p,l\nS1,n2,p2,l2';
    const result = parseScenesCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('parses multiple rows', () => {
    const csv = 'code,name,prompt,lighting_hint\nS1,n1,p1,l1\nS2,n2,p2,l2';
    const result = parseScenesCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toHaveLength(2);
  });

  it('accepts BOM', () => {
    const csv = '\uFEFFcode,name,prompt,lighting_hint\nS1,n,p,l';
    expect(parseScenesCsv(csv).ok).toBe(true);
  });

  it('rejects whitespace-only required field', () => {
    const csv = 'code,name,prompt,lighting_hint\nS1,   ,p,l';
    const result = parseScenesCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.column === 'name')).toBe(true);
    }
  });
});
