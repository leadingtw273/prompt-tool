import { create } from 'zustand';
import type {
  Character,
  Composition,
  Expression,
  Outfit,
  Pose,
  Scene,
} from '@/types';
import {
  loadActiveCharacterId,
  loadCharacters,
  loadCompositions,
  loadExpressions,
  loadOutfits,
  loadPoses,
  loadScenes,
  saveActiveCharacterId,
  saveCharacters,
  saveCompositions,
  saveExpressions,
  saveOutfits,
  savePoses,
  saveScenes,
} from '@/lib/dataStorage';

interface DataState {
  outfits: Outfit[];
  scenes: Scene[];
  poses: Pose[];
  expressions: Expression[];
  compositions: Composition[];
  charactersById: Record<string, Character>;
  activeCharacterId: string | null;
}

interface DataActions {
  importOutfits: (items: Outfit[]) => void;
  importScenes: (items: Scene[]) => void;
  importPoses: (items: Pose[]) => void;
  importExpressions: (items: Expression[]) => void;
  importCompositions: (items: Composition[]) => void;
  importCharacters: (map: Record<string, Character>) => void;
  setActiveCharacterId: (id: string | null) => void;
  reloadFromStorage: () => void;
}

function initialState(): DataState {
  return {
    outfits: loadOutfits(),
    scenes: loadScenes(),
    poses: loadPoses(),
    expressions: loadExpressions(),
    compositions: loadCompositions(),
    charactersById: loadCharacters(),
    activeCharacterId: loadActiveCharacterId(),
  };
}

export const useDataStore = create<DataState & DataActions>()((set) => ({
  ...initialState(),

  importOutfits: (items) => {
    saveOutfits(items);
    set({ outfits: items });
  },
  importScenes: (items) => {
    saveScenes(items);
    set({ scenes: items });
  },
  importPoses: (items) => {
    savePoses(items);
    set({ poses: items });
  },
  importExpressions: (items) => {
    saveExpressions(items);
    set({ expressions: items });
  },
  importCompositions: (items) => {
    saveCompositions(items);
    set({ compositions: items });
  },
  importCharacters: (map) => {
    saveCharacters(map);
    set({ charactersById: map });
  },
  setActiveCharacterId: (id) => {
    saveActiveCharacterId(id);
    set({ activeCharacterId: id });
  },
  reloadFromStorage: () => {
    set(initialState());
  },
}));
