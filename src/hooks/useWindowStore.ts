import { create } from 'zustand';

interface WindowState {
  activeWindowId: string | null;
  globalZIndex: number;
  setActiveWindow: (id: string) => number;
}

export const useWindowStore = create<WindowState>((set, get) => ({
  activeWindowId: null,
  globalZIndex: 100,
  setActiveWindow: (id) => {
    let newZIndex = get().globalZIndex + 1;
    if (newZIndex > 9999) newZIndex = 100;
    
    set({ activeWindowId: id, globalZIndex: newZIndex });
    return newZIndex;
  },
}));
