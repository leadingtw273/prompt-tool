import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOrderStore } from '@/store/useOrderStore';

describe('useOrderStore', () => {
  beforeEach(() => {
    useOrderStore.getState().reset();
  });

  describe('Given an empty store', () => {
    describe('When addOrder is called with a new order', () => {
      it('Then orders list length becomes 1 and the order gets an id and empty selectedCompCodes', () => {
        const { result } = renderHook(() => useOrderStore());
        act(() => {
          result.current.addOrder({
            outfit: 'CAS-02',
            scene: 'SCN-01',
            pose: 'POS-04',
            expr: 'EXP-01',
            tier: 'T0',
            selectedCompCodes: [],
          });
        });
        expect(result.current.orders).toHaveLength(1);
        expect(result.current.orders[0].id).toBeTruthy();
        expect(result.current.orders[0].selectedCompCodes).toEqual([]);
      });
    });
  });

  describe('Given an existing order', () => {
    describe('When updateOrder patches tier', () => {
      it('Then the order tier is updated in-place', () => {
        const { result } = renderHook(() => useOrderStore());
        let newId = '';
        act(() => {
          newId = result.current.addOrder({
            outfit: 'CAS-02',
            scene: 'SCN-01',
            pose: 'POS-04',
            expr: 'EXP-01',
            tier: 'T0',
            selectedCompCodes: [],
          });
        });
        act(() => {
          result.current.updateOrder(newId, { tier: 'T2' });
        });
        expect(result.current.orders[0].tier).toBe('T2');
      });
    });

    describe('When updateOrder patches selectedCompCodes', () => {
      it('Then the order selectedCompCodes is replaced by the patch value', () => {
        const { result } = renderHook(() => useOrderStore());
        let id = '';
        act(() => {
          id = result.current.addOrder({
            outfit: 'CAS-02',
            scene: 'SCN-01',
            pose: 'POS-04',
            expr: 'EXP-01',
            tier: 'T0',
            selectedCompCodes: [],
          });
        });
        act(() => {
          result.current.updateOrder(id, {
            selectedCompCodes: ['COMP-01', 'COMP-03'],
          });
        });
        expect(result.current.orders[0].selectedCompCodes).toEqual(['COMP-01', 'COMP-03']);
      });
    });

    describe('When removeOrder is called for an order with selections', () => {
      it('Then the order is removed from the list', () => {
        const { result } = renderHook(() => useOrderStore());
        let id = '';
        act(() => {
          id = result.current.addOrder({
            outfit: 'CAS-02',
            scene: 'SCN-01',
            pose: 'POS-04',
            expr: 'EXP-01',
            tier: 'T0',
            selectedCompCodes: ['COMP-01', 'COMP-02'],
          });
        });
        act(() => {
          result.current.removeOrder(id);
        });
        expect(result.current.orders).toHaveLength(0);
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

    it('setOptimizedField updates only the target language and clears error', () => {
      const { result } = renderHook(() => useOrderStore());
      act(() => {
        result.current.setAssembledPrompts([
          {
            orderId: 'o1',
            compCode: 'COMP-01',
            prompt: 'p',
            estimatedWords: 1,
            optimized: { en: 'old EN', zh: 'old ZH' },
            optimizeError: 'stale',
          },
        ]);
        result.current.setOptimizedField('o1', 'COMP-01', 'zh', 'new ZH');
      });
      expect(result.current.assembledPrompts[0].optimized).toEqual({
        en: 'old EN',
        zh: 'new ZH',
      });
      expect(result.current.assembledPrompts[0].optimizeError).toBeUndefined();
    });

    it('setOptimizedField initializes optimized when previously undefined', () => {
      const { result } = renderHook(() => useOrderStore());
      act(() => {
        result.current.setAssembledPrompts([
          { orderId: 'o1', compCode: 'COMP-01', prompt: 'p', estimatedWords: 1 },
        ]);
        result.current.setOptimizedField('o1', 'COMP-01', 'en', 'fresh EN');
      });
      expect(result.current.assembledPrompts[0].optimized).toEqual({
        en: 'fresh EN',
        zh: '',
      });
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
