import type {
  Outfit,
  Scene,
  Pose,
  Expression,
  Composition,
  Character,
  CompCompatibilityRule,
  ForbiddenCombination,
  TierConstraints,
} from '@/types';
import outfitsYaml from '@/data/styles/outfits.yaml';
import scenesYaml from '@/data/styles/scenes.yaml';
import posesYaml from '@/data/styles/poses.yaml';
import expressionsYaml from '@/data/styles/expressions.yaml';
import compositionsYaml from '@/data/styles/compositions.yaml';
import acc001Yaml from '@/data/characters/ACC-001.yaml';
import tierConstraintsYaml from '@/data/rules/tier_constraints.yaml';
import forbiddenCombinationsYaml from '@/data/rules/forbidden_combinations.yaml';
import compCompatibilityYaml from '@/data/rules/comp_compatibility.yaml';

export function loadOutfits(): Outfit[] {
  return outfitsYaml as Outfit[];
}

export function loadScenes(): Scene[] {
  return scenesYaml as Scene[];
}

export function loadPoses(): Pose[] {
  return posesYaml as Pose[];
}

export function loadExpressions(): Expression[] {
  return expressionsYaml as Expression[];
}

export function loadCompositions(): Composition[] {
  return compositionsYaml as Composition[];
}

export function loadCharacter(id: 'ACC-001'): Character {
  const registry: Record<string, Character> = {
    'ACC-001': acc001Yaml as Character,
  };
  const c = registry[id];
  if (!c) {
    throw new Error(`Unknown character: ${id}`);
  }
  return c;
}

export function loadTierConstraints(): TierConstraints {
  return tierConstraintsYaml as TierConstraints;
}

export function loadForbiddenCombinations(): ForbiddenCombination[] {
  return forbiddenCombinationsYaml as ForbiddenCombination[];
}

export function loadCompCompatibility(): CompCompatibilityRule[] {
  return compCompatibilityYaml as CompCompatibilityRule[];
}
