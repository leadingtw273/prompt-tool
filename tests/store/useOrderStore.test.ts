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
});
