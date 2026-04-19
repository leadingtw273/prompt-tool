export const OUTFIT_SCHEMA = {
  kind: 'outfits',
  displayName: 'Outfits',
  columns: ['code', 'name', 'prompt'] as const,
  hint: '3 個欄位皆為字串',
  example: ['code,name,prompt', 'CAS-01,咖啡廳穿搭,"casual cafe outfit"'].join('\n'),
} as const;

export const SCENE_SCHEMA = {
  kind: 'scenes',
  displayName: 'Scenes',
  columns: ['code', 'name', 'prompt', 'lighting_hint'] as const,
  hint: '4 個欄位皆為字串',
  example: [
    'code,name,prompt,lighting_hint',
    'SCN-01,咖啡廳室內,"cozy cafe interior",warm side lighting',
  ].join('\n'),
} as const;

export const POSE_SCHEMA = {
  kind: 'poses',
  displayName: 'Poses',
  columns: ['code', 'name', 'prompt', 'shot_suggestion'] as const,
  hint: '4 個欄位；shot_suggestion 以 | 分隔（合法值：close_up, extreme_close_up, medium, three_quarter_body, full_body）',
  example: [
    'code,name,prompt,shot_suggestion',
    'POS-01,站姿,"standing, relaxed",full_body|three_quarter_body',
  ].join('\n'),
} as const;

export const EXPRESSION_SCHEMA = {
  kind: 'expressions',
  displayName: 'Expressions',
  columns: ['code', 'name', 'prompt'] as const,
  hint: '3 個欄位皆為字串',
  example: ['code,name,prompt', 'EXP-01,微笑,"gentle smile"'].join('\n'),
} as const;

export const COMPOSITION_SCHEMA = {
  kind: 'compositions',
  displayName: 'Compositions',
  columns: ['code', 'name', 'prompt', 'shot', 'angle'] as const,
  hint:
    'shot ∈ (close_up, extreme_close_up, medium, three_quarter_body, full_body)；' +
    'angle ∈ (front, profile, 45deg, three_quarter, low_up, high_down, over_shoulder)',
  example: [
    'code,name,prompt,shot,angle',
    'COMP-01,特寫正面,"close-up headshot",close_up,front',
  ].join('\n'),
} as const;

export const SHOT_VALUES = [
  'close_up',
  'extreme_close_up',
  'medium',
  'three_quarter_body',
  'full_body',
] as const;

export const ANGLE_VALUES = [
  'front',
  'profile',
  '45deg',
  'three_quarter',
  'low_up',
  'high_down',
  'over_shoulder',
] as const;

export type ShotValue = typeof SHOT_VALUES[number];
export type AngleValue = typeof ANGLE_VALUES[number];
