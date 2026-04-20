import { create } from 'zustand';
import type { AssembledPrompt, OptimizedPrompt, Order } from '@/types';

interface OrderStoreState {
  characterId: 'ACC-001';
  orders: Order[];
  assembledPrompts: AssembledPrompt[];
}

interface OrderStoreActions {
  addOrder: (order: Omit<Order, 'id'>) => string;
  updateOrder: (id: string, patch: Partial<Omit<Order, 'id'>>) => void;
  removeOrder: (id: string) => void;
  setAssembledPrompts: (prompts: AssembledPrompt[]) => void;
  setOptimizing: (orderId: string, compCode: string, optimizing: boolean) => void;
  setOptimizingLanguage: (
    orderId: string,
    compCode: string,
    language: 'en' | 'zh' | null,
  ) => void;
  setOptimizedResult: (orderId: string, compCode: string, result: OptimizedPrompt) => void;
  setOptimizedField: (
    orderId: string,
    compCode: string,
    language: 'en' | 'zh',
    text: string,
  ) => void;
  setOptimizeError: (orderId: string, compCode: string, error: string) => void;
  reset: () => void;
}

const initialState: OrderStoreState = {
  characterId: 'ACC-001',
  orders: [],
  assembledPrompts: [],
};

function uid(): string {
  return crypto.randomUUID();
}

export const useOrderStore = create<OrderStoreState & OrderStoreActions>((set) => ({
  ...initialState,

  addOrder: (order) => {
    const id = uid();
    set((s) => ({ orders: [...s.orders, { ...order, id }] }));
    return id;
  },

  updateOrder: (id, patch) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  },

  removeOrder: (id) => {
    set((s) => ({
      orders: s.orders.filter((o) => o.id !== id),
    }));
  },

  setAssembledPrompts: (prompts) => set({ assembledPrompts: prompts }),

  setOptimizing: (orderId, compCode, optimizing) => {
    set((s) => ({
      assembledPrompts: s.assembledPrompts.map((p) =>
        p.orderId === orderId && p.compCode === compCode ? { ...p, optimizing } : p,
      ),
    }));
  },

  setOptimizingLanguage: (orderId, compCode, language) => {
    set((s) => ({
      assembledPrompts: s.assembledPrompts.map((p) =>
        p.orderId === orderId && p.compCode === compCode
          ? { ...p, optimizingLanguage: language ?? undefined }
          : p,
      ),
    }));
  },

  setOptimizedResult: (orderId, compCode, result) => {
    set((s) => ({
      assembledPrompts: s.assembledPrompts.map((p) =>
        p.orderId === orderId && p.compCode === compCode
          ? { ...p, optimized: result, optimizeError: undefined }
          : p,
      ),
    }));
  },

  setOptimizedField: (orderId, compCode, language, text) => {
    set((s) => ({
      assembledPrompts: s.assembledPrompts.map((p) => {
        if (p.orderId !== orderId || p.compCode !== compCode) {
          return p;
        }
        const base: OptimizedPrompt = p.optimized ?? { en: '', zh: '' };
        return {
          ...p,
          optimized: { ...base, [language]: text },
          optimizeError: undefined,
        };
      }),
    }));
  },

  setOptimizeError: (orderId, compCode, error) => {
    set((s) => ({
      assembledPrompts: s.assembledPrompts.map((p) =>
        p.orderId === orderId && p.compCode === compCode
          ? { ...p, optimizeError: error, optimized: undefined }
          : p,
      ),
    }));
  },

  reset: () => set(initialState),
}));
