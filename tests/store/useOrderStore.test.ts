import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOrderStore } from '@/store/useOrderStore';

describe('useOrderStore', () => {
  beforeEach(() => {
    useOrderStore.getState().reset();
  });

  describe('Given an empty store', () => {
    describe('When addOrder is called with a new order', () => {
      it('Then orders list length becomes 1 and the order gets an id', () => {
        const { result } = renderHook(() => useOrderStore());
        act(() => {
          result.current.addOrder({
            outfit: 'CAS-02',
            scene: 'SCN-01',
            pose: 'POS-04',
            expr: 'EXP-01',
            tier: 'T0',
            count: 4,
          });
        });
        expect(result.current.orders).toHaveLength(1);
        expect(result.current.orders[0].id).toBeTruthy();
      });
    });
  });

  describe('Given an existing order', () => {
    describe('When updateOrder patches count', () => {
      it('Then the order count is updated in-place', () => {
        const { result } = renderHook(() => useOrderStore());
        let newId = '';
        act(() => {
          newId = result.current.addOrder({
            outfit: 'CAS-02',
            scene: 'SCN-01',
            pose: 'POS-04',
            expr: 'EXP-01',
            tier: 'T0',
            count: 4,
          });
        });
        act(() => {
          result.current.updateOrder(newId, { count: 8 });
        });
        expect(result.current.orders[0].count).toBe(8);
      });
    });

    describe('When setCompSelection provides a recommended list', () => {
      it('Then both recommended and selected lists are stored', () => {
        const { result } = renderHook(() => useOrderStore());
        let id = '';
        act(() => {
          id = result.current.addOrder({
            outfit: 'CAS-02',
            scene: 'SCN-01',
            pose: 'POS-04',
            expr: 'EXP-01',
            tier: 'T0',
            count: 4,
          });
        });
        act(() => {
          result.current.setCompSelection(id, {
            recommendedCompCodes: ['COMP-01', 'COMP-03', 'COMP-04'],
            selectedCompCodes: ['COMP-01', 'COMP-03', 'COMP-04'],
          });
        });
        expect(result.current.compSelections[id].recommendedCompCodes).toHaveLength(3);
        expect(result.current.compSelections[id].selectedCompCodes).toHaveLength(3);
      });
    });

    describe('When toggleComp removes a selected comp', () => {
      it('Then selectedCompCodes no longer includes that code', () => {
        const { result } = renderHook(() => useOrderStore());
        let id = '';
        act(() => {
          id = result.current.addOrder({
            outfit: 'CAS-02',
            scene: 'SCN-01',
            pose: 'POS-04',
            expr: 'EXP-01',
            tier: 'T0',
            count: 4,
          });
          result.current.setCompSelection(id, {
            recommendedCompCodes: ['COMP-01', 'COMP-03'],
            selectedCompCodes: ['COMP-01', 'COMP-03'],
          });
        });
        act(() => {
          result.current.toggleComp(id, 'COMP-01');
        });
        expect(result.current.compSelections[id].selectedCompCodes).toEqual(['COMP-03']);
      });
    });
  });

  describe('optimize actions', () => {
    it('setOptimizing toggles the optimizing flag on the matching AssembledPrompt', () => {
      const { result } = renderHook(() => useOrderStore());
      act(() => {
        result.current.setAssembledPrompts([
          { orderId: 'o1', compCode: 'COMP-01', prompt: 'p', estimatedWords: 1 },
        ]);
        result.current.setOptimizing('o1', 'COMP-01', true);
      });
      expect(result.current.assembledPrompts[0].optimizing).toBe(true);
      act(() => {
        result.current.setOptimizing('o1', 'COMP-01', false);
      });
      expect(result.current.assembledPrompts[0].optimizing).toBe(false);
    });

    it('setOptimizedResult stores the result and clears error', () => {
      const { result } = renderHook(() => useOrderStore());
      act(() => {
        result.current.setAssembledPrompts([
          {
            orderId: 'o1',
            compCode: 'COMP-01',
            prompt: 'p',
            estimatedWords: 1,
            optimizeError: 'old error',
          },
        ]);
        result.current.setOptimizedResult('o1', 'COMP-01', { en: 'EN', zh: 'ZH' });
      });
      expect(result.current.assembledPrompts[0].optimized).toEqual({ en: 'EN', zh: 'ZH' });
      expect(result.current.assembledPrompts[0].optimizeError).toBeUndefined();
    });

    it('setOptimizeError stores error and clears previous result', () => {
      const { result } = renderHook(() => useOrderStore());
      act(() => {
        result.current.setAssembledPrompts([
          {
            orderId: 'o1',
            compCode: 'COMP-01',
            prompt: 'p',
            estimatedWords: 1,
            optimized: { en: 'old', zh: 'old' },
          },
        ]);
        result.current.setOptimizeError('o1', 'COMP-01', 'fail');
      });
      expect(result.current.assembledPrompts[0].optimizeError).toBe('fail');
      expect(result.current.assembledPrompts[0].optimized).toBeUndefined();
    });

    it('non-matching (orderId, compCode) leaves prompts unchanged', () => {
      const { result } = renderHook(() => useOrderStore());
      act(() => {
        result.current.setAssembledPrompts([
          { orderId: 'o1', compCode: 'COMP-01', prompt: 'p', estimatedWords: 1 },
        ]);
        result.current.setOptimizing('o1', 'COMP-99', true);
      });
      expect(result.current.assembledPrompts[0].optimizing).toBeUndefined();
    });

    it('only updates the matching (orderId, compCode) entry when multiple prompts exist', () => {
      const { result } = renderHook(() => useOrderStore());
      act(() => {
        result.current.setAssembledPrompts([
          { orderId: 'o1', compCode: 'COMP-01', prompt: 'p1', estimatedWords: 1 },
          { orderId: 'o1', compCode: 'COMP-02', prompt: 'p2', estimatedWords: 1 },
          { orderId: 'o2', compCode: 'COMP-01', prompt: 'p3', estimatedWords: 1 },
        ]);
        result.current.setOptimizing('o1', 'COMP-01', true);
      });
      expect(result.current.assembledPrompts[0].optimizing).toBe(true);
      expect(result.current.assembledPrompts[1].optimizing).toBeUndefined();
      expect(result.current.assembledPrompts[2].optimizing).toBeUndefined();
    });
  });
});
