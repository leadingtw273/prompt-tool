import { describe, it, expect } from 'vitest';
import {
  isCompCompatible,
  isOrderForbidden,
  isTierAllowedForExpression,
} from '@/lib/compatibility';
import type { Composition } from '@/types';

const COMP_06: Composition = {
  code: 'COMP-06',
  name: '全身低視角',
  prompt: 'full-body shot, low angle looking up, 3/4 angle',
  shot: 'full_body',
  angle: 'low_up',
};

const COMP_01: Composition = {
  code: 'COMP-01',
  name: '特寫正面',
  prompt: 'close-up headshot, front view, eye-level, direct gaze at camera',
  shot: 'close_up',
  angle: 'front',
};

const compatibilityRules = [
  { comp_code: 'COMP-06', forbidden_poses: ['POS-04', 'POS-05', 'POS-06'] },
];

describe('compatibility', () => {
  describe('Given COMP-06 (low-angle) and POS-04 (sitting)', () => {
    describe('When isCompCompatible is checked', () => {
      it('Then returns false because low-angle shot conflicts with sitting pose', () => {
        const result = isCompCompatible(
          COMP_06,
          {
            pose: 'POS-04',
            outfit: 'CAS-02',
            scene: 'SCN-01',
          },
          compatibilityRules,
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('Given COMP-01 (close-up) and POS-04 (sitting)', () => {
    describe('When isCompCompatible is checked', () => {
      it('Then returns true because no conflict rule exists', () => {
        const result = isCompCompatible(
          COMP_01,
          {
            pose: 'POS-04',
            outfit: 'CAS-02',
            scene: 'SCN-01',
          },
          compatibilityRules,
        );
        expect(result).toBe(true);
      });
    });
  });

  describe('Given a Tier-blacklist forbidden combination', () => {
    describe('When isOrderForbidden is checked with tier T2', () => {
      it('Then returns true because T2 is blacklisted', () => {
        const rules = [
          {
            reason: 'Phase 1 restriction',
            rules: [{ tier_blacklist: ['T2' as const, 'T3' as const] }],
          },
        ];
        const result = isOrderForbidden(
          { outfit: 'CAS-02', scene: 'SCN-01', pose: 'POS-04', expr: 'EXP-01', tier: 'T2', count: 1 },
          rules,
        );
        expect(result.forbidden).toBe(true);
      });
    });
  });

  describe('Given an expression restricted to T2+ only', () => {
    describe('When isTierAllowedForExpression is checked with T0', () => {
      it('Then returns false', () => {
        const result = isTierAllowedForExpression(
          { tier_restriction: ['T2', 'T3'] } as any,
          'T0',
        );
        expect(result).toBe(false);
      });
    });
  });
});
