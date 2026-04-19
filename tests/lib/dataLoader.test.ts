import { describe, it, expect } from 'vitest';
import { loadTierConstraints } from '@/lib/dataLoader';

describe('dataLoader', () => {
  describe('Given tier_constraints YAML bundled by vite-plugin-yaml', () => {
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
