import { describe, it, expect } from 'vitest';
import {
  loadOutfits,
  loadScenes,
  loadPoses,
  loadExpressions,
  loadCompositions,
  loadCharacter,
  loadTierConstraints,
} from '@/lib/dataLoader';

describe('dataLoader', () => {
  describe('Given YAML files bundled by vite-plugin-yaml', () => {
    describe('When loadOutfits is called', () => {
      it('Then returns an array of outfits with required fields', () => {
        const outfits = loadOutfits();
        expect(Array.isArray(outfits)).toBe(true);
        expect(outfits.length).toBeGreaterThan(0);
        expect(outfits[0]).toHaveProperty('code');
        expect(outfits[0]).toHaveProperty('prompt');
        expect(outfits[0]).toHaveProperty('default_tier');
      });
    });

    describe('When loadCompositions is called', () => {
      it('Then returns compositions with shot and angle fields', () => {
        const comps = loadCompositions();
        expect(comps.length).toBeGreaterThan(0);
        expect(comps[0]).toHaveProperty('shot');
        expect(comps[0]).toHaveProperty('angle');
      });
    });

    describe('When loadCharacter is called with ACC-001', () => {
      it('Then returns character with signature_features and prohibited', () => {
        const c = loadCharacter('ACC-001');
        expect(c.character_id).toBe('ACC-001');
        expect(Array.isArray(c.signature_features)).toBe(true);
        expect(Array.isArray(c.prohibited)).toBe(true);
      });
    });

    describe('When loadTierConstraints is called', () => {
      it('Then returns a map containing T0 and T1 keys', () => {
        const t = loadTierConstraints();
        expect(t).toHaveProperty('T0');
        expect(t).toHaveProperty('T1');
        expect(typeof t.T0).toBe('string');
      });
    });
  });
});
