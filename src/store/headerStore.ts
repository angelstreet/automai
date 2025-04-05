import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HeaderState {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  toggleVisibility: () => void;
}

export const useHeaderStore = create<HeaderState>()(
  persist(
    (set) => ({
      isVisible: true, // Default: header is visible
      setIsVisible: (isVisible: boolean) => set({ isVisible }),
      toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
    }),
    {
      name: 'header-settings', // localStorage key
    },
  ),
);
