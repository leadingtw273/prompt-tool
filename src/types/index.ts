export type Tier = 'T0' | 'T1' | 'T2' | 'T3';

export interface Outfit {
  code: string;
  name: string;
  prompt: string;
  default_tier: Tier;
  downgradable_to?: Tier;
  ocr_note?: string | null;
}

export interface Scene {
  code: string;
  name: string;
  prompt: string;
  lighting_hint: string;
}

export interface Pose {
  code: string;
  name: string;
  prompt: string;
  shot_suggestion: string[];
}

export interface Expression {
  code: string;
  name: string;
  prompt: string;
  tier_restriction: Tier[];
}

export type Shot =
  | 'close_up'
  | 'extreme_close_up'
  | 'medium'
  | 'three_quarter_body'
  | 'full_body';

export type Angle =
  | 'front'
  | 'profile'
  | '45deg'
  | 'three_quarter'
  | 'low_up'
  | 'high_down'
  | 'over_shoulder';

export interface Composition {
  code: string;
  name: string;
  prompt: string;
  shot: Shot;
  angle: Angle;
}

export interface Character {
  character_id: string;
  display_name: string;
  model: {
    base: string;
    lora: string;
    lora_weight_range: [number, number];
    trigger_word: string;
  };
  appearance: {
    face_type: string;
    eye: string;
    hair_default: string;
    hair_variations: string[];
    skin_tone: string;
    skin_hex: string;
    body: string;
    age_range: [number, number];
  };
  signature_features: string[];
  prohibited: string[];
  personality: string[];
  color_palette: {
    theme: string;
    colors: string[];
    usage: 'outfit_filter_only' | 'prompt_inject';
  };
}

export interface CompCompatibilityRule {
  comp_code: string;
  forbidden_poses?: string[];
  forbidden_outfits?: string[];
  forbidden_scenes?: string[];
}

export interface ForbiddenCombination {
  reason: string;
  rules: Array<{
    outfit?: string;
    scene_blacklist?: string[];
    pose_blacklist?: string[];
    tier_blacklist?: Tier[];
    outfit_blacklist?: string[];
    expression_blacklist?: string[];
  }>;
}

export type TierConstraints = Record<Tier, string>;

export interface Order {
  id: string;
  outfit: string;
  scene: string;
  pose: string;
  expr: string;
  tier: Tier;
  count: number;
}

export interface CompSelection {
  orderId: string;
  selectedCompCodes: string[];
  recommendedCompCodes: string[];
}

export interface AssembledPrompt {
  orderId: string;
  compCode: string;
  prompt: string;
  estimatedWords: number;
}
