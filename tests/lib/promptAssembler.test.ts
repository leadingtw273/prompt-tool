import { describe, it, expect } from 'vitest';
import { assemblePrompt } from '@/lib/promptAssembler';
import type {
  Character,
  Composition,
  Expression,
  Outfit,
  Pose,
  Scene,
  TierConstraints,
} from '@/types';

const character: Character = {
  character_id: 'ACC-001',
  display_name: 'Luna',
  model: {
    base: 'zImageTurbo',
    lora: 'luna_v1_zturbo.safetensors',
    lora_weight_range: [0.7, 0.85],
    trigger_word: 'luna_face',
  },
  appearance: {
    face_type: 'oval face with pointed chin',
    eye: 'large double-eyelid eyes with dark brown irises',
    hair_default: 'black straight shoulder-length hair',
    hair_variations: [],
    skin_tone: 'natural wheat skin tone',
    skin_hex: '#D4A574',
    body: 'medium build',
    age_range: [22, 26],
  },
  signature_features: [
    'a distinctive small mole on her right cheek',
    'a delicate bracelet on her left wrist',
  ],
  prohibited: ['tattoo', 'glasses', 'short hair'],
  personality: [],
  color_palette: { theme: 'warm', colors: [], usage: 'outfit_filter_only' },
};

const outfit: Outfit = {
  code: 'CAS-02',
  name: '條紋襯衫 + 寬褲',
  prompt: 'striped button-up shirt, wide leg pants, loafers',
};

const scene: Scene = {
  code: 'SCN-01',
  name: '咖啡廳室內',
  prompt: 'cozy cafe interior, wooden table, latte on the table',
  lighting_hint: 'warm side lighting',
};

const pose: Pose = {
  code: 'POS-04',
  name: '椅子坐姿',
  prompt: 'sitting on chair, legs crossed, relaxed',
  shot_suggestion: ['full_body', 'medium'],
};

const expr: Expression = {
  code: 'EXP-01',
  name: '自然微笑',
  prompt: 'gentle smile, soft expression, warm eyes',
};

const comp: Composition = {
  code: 'COMP-03',
  name: '半身正面置中',
  prompt: 'medium shot, front view, centered, direct gaze',
  shot: 'medium',
  angle: 'front',
};

const tierConstraints: TierConstraints = {
  T0: 'fully clothed, modest casual outfit, safe for work, non-sexual',
  T1: 'tastefully styled, casual sensuality, no explicit exposure',
  T2: 'private subscription content',
  T3: 'premium PPV content',
};

describe('promptAssembler', () => {
  describe('Given a complete set of inputs (CAS-02 + SCN-01 + POS-04 + EXP-01 + COMP-03 + T0)', () => {
    describe('When assemblePrompt is called', () => {
      const result = assemblePrompt({
        order: { outfit: 'CAS-02', scene: 'SCN-01', pose: 'POS-04', expr: 'EXP-01', tier: 'T0' },
        comp,
        character,
        outfit,
        scene,
        pose,
        expression: expr,
        tierConstraints,
      });

      it('Then starts with the composition prompt (camera-first)', () => {
        expect(result.startsWith(comp.prompt)).toBe(true);
      });

      it('Then contains the LoRA trigger word', () => {
        expect(result).toContain('luna_face');
      });

      it('Then contains "adult" to satisfy zImageTurbo safety guideline', () => {
        expect(result).toContain('adult');
      });

      it('Then emphasizes signature_features via "featuring ..." structure (no weights)', () => {
        expect(result).toContain('featuring a distinctive small mole on her right cheek');
        expect(result).not.toMatch(/\(.+:1\.\d+\)/);
      });

      it('Then includes outfit prompt', () => {
        expect(result).toContain('striped button-up shirt');
      });

      it('Then includes scene prompt', () => {
        expect(result).toContain('cozy cafe interior');
      });

      it('Then includes pose prompt', () => {
        expect(result).toContain('sitting on chair');
      });

      it('Then includes expression prompt', () => {
        expect(result).toContain('gentle smile');
      });

      it('Then appends T0 tier constraint', () => {
        expect(result).toContain('fully clothed, modest casual outfit');
      });

      it('Then appends global constraints (no text, no watermark)', () => {
        expect(result).toContain('no text');
        expect(result).toContain('no watermark');
      });

      it('Then converts prohibited features to "no tattoo, no glasses, no short hair" inline', () => {
        expect(result).toContain('no tattoo');
        expect(result).toContain('no glasses');
        expect(result).toContain('no short hair');
      });

      it('Then contains no negative prompt section (zImageTurbo does not use it)', () => {
        expect(result.toLowerCase()).not.toMatch(/^negative:/m);
      });

      it('Then omits face_type / eye / hair_default (encoded by LoRA trigger word)', () => {
        expect(result).not.toContain('oval face with pointed chin');
        expect(result).not.toContain('large double-eyelid eyes with dark brown irises');
        expect(result).not.toContain('black straight shoulder-length hair');
      });

      it('Then includes character.appearance.body near the subject descriptor', () => {
        expect(result).toContain('medium build');
      });

      it('Then places environment (scene) before clothing (outfit) per camera-first order', () => {
        const sceneIdx = result.indexOf('cozy cafe interior');
        const outfitIdx = result.indexOf('striped button-up shirt');
        expect(sceneIdx).toBeGreaterThan(-1);
        expect(outfitIdx).toBeGreaterThan(-1);
        expect(sceneIdx).toBeLessThan(outfitIdx);
      });
    });
  });
});
