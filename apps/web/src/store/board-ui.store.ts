import { create } from 'zustand';

interface BoardUiState {
  collapsedLaneIds: Record<string, boolean>;
  toggleLaneCollapse: (laneId: string) => void;
  activeDragId: string | null;
  setActiveDragId: (id: string | null) => void;
}

export const useBoardUiStore = create<BoardUiState>((set) => ({
  collapsedLaneIds: {},
  toggleLaneCollapse: (laneId) =>
    set((state) => ({
      collapsedLaneIds: {
        ...state.collapsedLaneIds,
        [laneId]: !state.collapsedLaneIds[laneId],
      },
    })),
  activeDragId: null,
  setActiveDragId: (id) => set({ activeDragId: id }),
}));
