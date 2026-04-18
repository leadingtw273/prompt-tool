import type { Composition, Pose } from '@/types';

export function getRecommendedCompCodes(
  pose: Pose | undefined,
  compositions: Composition[],
): string[] {
  if (!pose || pose.shot_suggestion.length === 0) {
    return [];
  }
  return compositions
    .filter((c) => pose.shot_suggestion.includes(c.shot))
    .map((c) => c.code);
}
