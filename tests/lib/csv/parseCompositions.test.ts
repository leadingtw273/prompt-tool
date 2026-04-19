import { describe, expect, it } from 'vitest';
import { parseCompositionsCsv } from '@/lib/csv/parseCompositions';

describe('parseCompositionsCsv', () => {
  it('parses valid CSV', () => {
    const csv = 'code,name,prompt,shot,angle\nC1,特寫,"close-up",close_up,front';
    const result = parseCompositionsCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].shot).toBe('close_up');
      expect(result.items[0].angle).toBe('front');
    }
  });

  it('rejects invalid shot value', () => {
    const csv = 'code,name,prompt,shot,angle\nC1,n,p,portrait,front';
    const result = parseCompositionsCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toContain('portrait');
    }
  });

  it('rejects invalid angle value', () => {
    const csv = 'code,name,prompt,shot,angle\nC1,n,p,close_up,sideways';
    const result = parseCompositionsCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toContain('sideways');
    }
  });

  it('rejects when shot is empty', () => {
    const csv = 'code,name,prompt,shot,angle\nC1,n,p,,front';
    expect(parseCompositionsCsv(csv).ok).toBe(false);
  });

  it('rejects column mismatch', () => {
    const csv = 'code,name,prompt,shot\nC1,n,p,close_up';
    expect(parseCompositionsCsv(csv).ok).toBe(false);
  });

  it('rejects duplicate code', () => {
    const csv = 'code,name,prompt,shot,angle\nC1,n,p,close_up,front\nC1,n2,p2,medium,profile';
    expect(parseCompositionsCsv(csv).ok).toBe(false);
  });

  it('accepts BOM', () => {
    expect(parseCompositionsCsv('\uFEFFcode,name,prompt,shot,angle\nC1,n,p,close_up,front').ok).toBe(true);
  });

  it('rejects whitespace-only required field', () => {
    const csv = 'code,name,prompt,shot,angle\nC1,   ,p,close_up,front';
    const result = parseCompositionsCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.column === 'name')).toBe(true);
    }
  });
});
