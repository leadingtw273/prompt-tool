import { describe, expect, it } from 'vitest';
import { getRecommendedCompCodes } from '@/lib/compRecommendation';
import type { Composition, Pose } from '@/types';

const comps: Composition[] = [
  { code: 'COMP-01', name: '特寫正面', prompt: 'close-up headshot', shot: 'close_up', angle: 'front' },
  { code: 'COMP-03', name: '半身正面', prompt: 'medium shot', shot: 'medium', angle: 'front' },
  { code: 'COMP-04', name: '全身 3/4', prompt: 'full-body shot', shot: 'full_body', angle: 'three_quarter' },
  { code: 'COMP-05', name: '七分身側目', prompt: 'three-quarter body', shot: 'three_quarter_body', angle: '45deg' },
];

function makePose(shot_suggestion: string[]): Pose {
  return {
    code: 'POS-TEST',
    name: 'test pose',
    prompt: 'test prompt',
    shot_suggestion,
  };
}

describe('getRecommendedCompCodes', () => {
  it('returns [] when pose is undefined', () => {
    expect(getRecommendedCompCodes(undefined, comps)).toEqual([]);
  });

  it('returns [] when pose.shot_suggestion is empty', () => {
    expect(getRecommendedCompCodes(makePose([]), comps)).toEqual([]);
  });

  it('returns [] when compositions is empty', () => {
    expect(getRecommendedCompCodes(makePose(['full_body']), [])).toEqual([]);
  });

  it('returns the matching comp code for a single-shot suggestion', () => {
    expect(getRecommendedCompCodes(makePose(['full_body']), comps)).toEqual(['COMP-04']);
  });

  it('returns all matching comp codes for a multi-shot suggestion', () => {
    expect(
      getRecommendedCompCodes(makePose(['full_body', 'three_quarter_body']), comps),
    ).toEqual(['COMP-04', 'COMP-05']);
  });

  it('returns [] when no comp.shot matches any suggestion', () => {
    expect(getRecommendedCompCodes(makePose(['extreme_close_up']), comps)).toEqual([]);
  });

  it('preserves the input compositions order in the output', () => {
    // comps 順序：close_up, medium, full_body, three_quarter_body
    // suggestion 順序：three_quarter_body, close_up, full_body
    // 期望輸出以 comps 的順序為準：close_up, full_body, three_quarter_body
    expect(
      getRecommendedCompCodes(
        makePose(['three_quarter_body', 'close_up', 'full_body']),
        comps,
      ),
    ).toEqual(['COMP-01', 'COMP-04', 'COMP-05']);
  });
});
