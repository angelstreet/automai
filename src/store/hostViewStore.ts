import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ViewMode, DEFAULT_VIEW_MODE } from '@/app/[locale]/[tenant]/hosts/constants';

interface HostViewState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

export const useHostViewStore = create<HostViewState>()(
  persist(
    (set) => ({
      viewMode: DEFAULT_VIEW_MODE,
      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
      toggleViewMode: () =>
        set((state) => ({
          viewMode: state.viewMode === 'grid' ? 'table' : 'grid',
        })),
    }),
    {
      name: 'host-view-settings',
    },
  ),
);
