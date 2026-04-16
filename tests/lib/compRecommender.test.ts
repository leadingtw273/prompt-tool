import { describe, it, expect } from 'vitest';
import { recommendComps } from '@/lib/compRecommender';
import type { Composition } from '@/types';

const allComps: Composition[] = [
  { code: 'COMP-01', name: '特寫正面', prompt: '', shot: 'close_up', angle: 'front' },
  { code: 'COMP-02', name: '特寫45度', prompt: '', shot: 'close_up', angle: '45deg' },
  { code: 'COMP-03', name: '半身正面', prompt: '', shot: 'medium', angle: 'front' },
  { code: 'COMP-04', name: '全身3/4', prompt: '', shot: 'full_body', angle: 'three_quarter' },
  { code: 'COMP-05', name: '七分身', prompt: '', shot: 'three_quarter_body', angle: '45deg' },
  { code: 'COMP-06', name: '全身低視角', prompt: '', shot: 'full_body', angle: 'low_up' },
  { code: 'COMP-09', name: '極近特寫', prompt: '', shot: 'extreme_close_up', angle: 'front' },
  { code: 'COMP-10', name: '側面半臉', prompt: '', shot: 'medium', angle: 'profile' },
];

describe('compRecommender', () => {
  describe('Given all 8 compatible comps spanning 5 shot categories', () => {
    describe('When recommendComps asks for n=5 with seed for reproducibility', () => {
      it('Then returns 5 comps each from a different shot bucket', () => {
        const result = recommendComps({
          pool: allComps,
          n: 5,
          rngSeed: 42,
        });
        expect(result).toHaveLength(5);
        const shots = new Set(result.map((c) => c.shot));
        expect(shots.size).toBe(5);
      });
    });

    describe('When n exceeds distinct shot count', () => {
      it('Then fills remaining slots from leftover pool', () => {
        const result = recommendComps({
          pool: allComps,
          n: 7,
          rngSeed: 42,
        });
        expect(result).toHaveLength(7);
      });
    });
  });

  describe('Given an empty pool', () => {
    describe('When recommendComps is called', () => {
      it('Then returns an empty array', () => {
        const result = recommendComps({ pool: [], n: 5, rngSeed: 42 });
        expect(result).toEqual([]);
      });
    });
  });

  describe('Given the same rngSeed', () => {
    describe('When called twice', () => {
      it('Then returns the same comps in the same order (reproducibility)', () => {
        const a = recommendComps({ pool: allComps, n: 4, rngSeed: 7 });
        const b = recommendComps({ pool: allComps, n: 4, rngSeed: 7 });
        expect(a.map((c) => c.code)).toEqual(b.map((c) => c.code));
      });
    });
  });
});
