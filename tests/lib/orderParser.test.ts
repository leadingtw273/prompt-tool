import { describe, it, expect } from 'vitest';
import { parseOrderText, type ParseResult } from '@/lib/orderParser';

describe('orderParser', () => {
  describe('Given well-formed order text', () => {
    describe('When "CAS-02_SCN-01_POS-04_EXP-01 T0 x4" is parsed', () => {
      it('Then returns a successful Order with all four codes and count=4', () => {
        const result: ParseResult = parseOrderText('CAS-02_SCN-01_POS-04_EXP-01 T0 x4');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.order.outfit).toBe('CAS-02');
          expect(result.order.scene).toBe('SCN-01');
          expect(result.order.pose).toBe('POS-04');
          expect(result.order.expr).toBe('EXP-01');
          expect(result.order.tier).toBe('T0');
          expect(result.order.count).toBe(4);
        }
      });
    });

    describe('When tier is T1 and count is 3', () => {
      it('Then parses tier and count correctly', () => {
        const result = parseOrderText('INT-06_SCN-07_POS-06_EXP-01 T1 x3');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.order.tier).toBe('T1');
          expect(result.order.count).toBe(3);
        }
      });
    });
  });

  describe('Given malformed order text', () => {
    describe('When the four codes are missing an underscore', () => {
      it('Then returns ok:false with an error message', () => {
        const result = parseOrderText('CAS-02-SCN-01-POS-04-EXP-01 T0 x4');
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toMatch(/four codes/i);
        }
      });
    });

    describe('When tier is invalid (T4)', () => {
      it('Then returns ok:false with an error message', () => {
        const result = parseOrderText('CAS-02_SCN-01_POS-04_EXP-01 T4 x4');
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toMatch(/tier/i);
        }
      });
    });

    describe('When count is missing or non-numeric', () => {
      it('Then returns ok:false with an error message', () => {
        const result = parseOrderText('CAS-02_SCN-01_POS-04_EXP-01 T0 xabc');
        expect(result.ok).toBe(false);
      });
    });
  });
});
