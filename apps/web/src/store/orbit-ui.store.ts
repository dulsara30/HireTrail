import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type OrbitApplicationEventDto,
  type OrbitKind,
  type OrbitZoomDays,
} from '@hiretrail/shared';
import { EMPTY_ORBIT_FILTERS, type OrbitFilters } from '../utils/helpers/orbit/orbit-events';

export type OrbitSelection =
  | { type: 'task'; id: string }
  | { type: 'application'; event: OrbitApplicationEventDto }
  | {
      type: 'new';
      draft?: { kind?: OrbitKind; dueAt?: string; applicationId?: string; companyId?: string };
    };

interface OrbitUiState {
  filters: OrbitFilters;
  setFilters: (patch: Partial<OrbitFilters>) => void;
  resetFilters: () => void;
  /** YYYY-MM-DD the radar is centred on, or null for today. */
  referenceDate: string | null;
  setReferenceDate: (date: string | null) => void;
  zoom: OrbitZoomDays;
  setZoom: (zoom: OrbitZoomDays) => void;
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  selected: OrbitSelection | null;
  select: (selection: OrbitSelection | null) => void;
  activeSpaceId: string | null;
  setActiveSpaceId: (id: string | null) => void;
  galleryOpen: boolean;
  setGalleryOpen: (open: boolean) => void;
}

export const useOrbitUiStore = create<OrbitUiState>()(
  persist(
    (set) => ({
      filters: EMPTY_ORBIT_FILTERS,
      setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
      resetFilters: () => set({ filters: EMPTY_ORBIT_FILTERS }),
      referenceDate: null,
      setReferenceDate: (referenceDate) => set({ referenceDate }),
      zoom: 14,
      setZoom: (zoom) => set({ zoom }),
      editMode: false,
      setEditMode: (editMode) => set({ editMode }),
      selected: null,
      select: (selected) => set({ selected }),
      activeSpaceId: null,
      setActiveSpaceId: (activeSpaceId) => set({ activeSpaceId }),
      galleryOpen: false,
      setGalleryOpen: (galleryOpen) => set({ galleryOpen }),
    }),
    {
      name: 'ht_orbit_ui',
      // Only the things worth remembering between visits
      partialize: (state) => ({
        filters: state.filters,
        zoom: state.zoom,
        activeSpaceId: state.activeSpaceId,
      }),
    },
  ),
);
