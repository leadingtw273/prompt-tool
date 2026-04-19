import type { TierConstraints } from '@/types';
import tierConstraintsYaml from '@/data/rules/tier_constraints.yaml';

export function loadTierConstraints(): TierConstraints {
  return tierConstraintsYaml as TierConstraints;
}
