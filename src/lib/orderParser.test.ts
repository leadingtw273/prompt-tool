import { describe, expect, it } from 'vitest';
import { parseCodes } from './orderParser';

describe('parseCodes', () => {
  it('parses a valid four-code combo', () => {
    const result = parseCodes('CAS-01_SCN-01_POS-01_EXP-01');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.codes).toEqual({
        outfit: 'CAS-01',
        scene: 'SCN-01',
        pose: 'POS-01',
        expr: 'EXP-01',
      });
    }
  });

  it('trims surrounding whitespace', () => {
    const result = parseCodes('  GRL-02_SCN-03_POS-04_EXP-05  ');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.codes.outfit).toBe('GRL-02');
    }
  });

  it('rejects when there are not exactly four underscore-separated parts', () => {
    const result = parseCodes('CAS-01_SCN-01_POS-01');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/four codes/i);
    }
  });

  it('rejects an invalid outfit prefix', () => {
    const result = parseCodes('XXX-01_SCN-01_POS-01_EXP-01');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/outfit/i);
    }
  });

  it('rejects an invalid scene code', () => {
    const result = parseCodes('CAS-01_SCN-1_POS-01_EXP-01');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/scene/i);
    }
  });

  it('rejects an invalid pose code', () => {
    const result = parseCodes('CAS-01_SCN-01_POS-XX_EXP-01');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/pose/i);
    }
  });

  it('rejects an invalid expression code', () => {
    const result = parseCodes('CAS-01_SCN-01_POS-01_EXP-XX');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/expression|expr/i);
    }
  });
});
