import { describe, expect, it } from 'vitest';
import { parsePosesCsv } from '@/lib/csv/parsePoses';

describe('parsePosesCsv', () => {
  it('parses a single-value shot_suggestion', () => {
    const csv = 'code,name,prompt,shot_suggestion\nPOS-01,站姿,"standing, relaxed",full_body';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].shot_suggestion).toEqual(['full_body']);
    }
  });

  it('parses multi-value shot_suggestion split by pipe', () => {
    const csv = 'code,name,prompt,shot_suggestion\nP1,n,p,full_body|three_quarter_body';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].shot_suggestion).toEqual(['full_body', 'three_quarter_body']);
    }
  });

  it('rejects when shot_suggestion contains invalid value', () => {
    const csv = 'code,name,prompt,shot_suggestion\nP1,n,p,portrait';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toContain('portrait');
    }
  });

  it('rejects when shot_suggestion has empty element between pipes', () => {
    const csv = 'code,name,prompt,shot_suggestion\nP1,n,p,full_body||medium';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('rejects when shot_suggestion is empty string', () => {
    const csv = 'code,name,prompt,shot_suggestion\nP1,n,p,';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('rejects duplicate code', () => {
    const csv = 'code,name,prompt,shot_suggestion\nP1,n,p,full_body\nP1,n2,p2,medium';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('rejects column mismatch', () => {
    const csv = 'code,name,prompt\nP1,n,p';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(false);
  });

  it('accepts BOM', () => {
    const csv = '\uFEFFcode,name,prompt,shot_suggestion\nP1,n,p,full_body';
    expect(parsePosesCsv(csv).ok).toBe(true);
  });

  it('rejects whitespace-only required field', () => {
    const csv = 'code,name,prompt,shot_suggestion\nP1,   ,p,full_body';
    const result = parsePosesCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.column === 'name')).toBe(true);
    }
  });
});
