import type {
  Character,
  Composition,
  Expression,
  Order,
  Outfit,
  Pose,
  Scene,
  TierConstraints,
} from '@/types';

interface AssembleArgs {
  order: Omit<Order, 'id'>;
  comp: Composition;
  character: Character;
  outfit: Outfit;
  scene: Scene;
  pose: Pose;
  expression: Expression;
  tierConstraints: TierConstraints;
}

const GLOBAL_QUALITY =
  'realistic photography, 85mm lens, shallow depth of field, detailed natural skin';
const GLOBAL_CONSTRAINTS =
  'no text, no watermark, no logos, plain uncluttered background, correct human anatomy';

function buildSubjectDescription(character: Character): string {
  const [ageFrom] = character.appearance.age_range;
  const ageDesc = `in her early ${ageFrom}s`;
  return [
    character.model.trigger_word,
    `an adult woman ${ageDesc}`,
    character.appearance.face_type,
    character.appearance.eye,
    character.appearance.hair_default,
    character.appearance.skin_tone,
  ].join(', ');
}

function buildSignatureClause(character: Character): string {
  if (character.signature_features.length === 0) {
    return '';
  }
  return `featuring ${character.signature_features.join(' and ')}`;
}

function buildProhibitedClause(character: Character): string {
  return character.prohibited.map((p) => `no ${p}`).join(', ');
}

function buildLighting(comp: Composition, scene: Scene): string {
  if (comp.angle === 'low_up') {
    return 'dramatic natural lighting, bold perspective';
  }
  if (comp.angle === 'high_down') {
    return 'soft overhead lighting';
  }
  return scene.lighting_hint;
}

export function assemblePrompt(args: AssembleArgs): string {
  const { order, comp, character, outfit, scene, pose, expression, tierConstraints } = args;

  const parts: string[] = [
    comp.prompt,
    buildSubjectDescription(character),
    buildSignatureClause(character),
    `wearing ${outfit.prompt}`,
    `in ${scene.prompt}`,
    pose.prompt,
    expression.prompt,
    `${buildLighting(comp, scene)}, ${GLOBAL_QUALITY}`,
    `${tierConstraints[order.tier]}, ${GLOBAL_CONSTRAINTS}, ${buildProhibitedClause(character)}`,
  ].filter(Boolean);

  return parts.join(', ');
}
