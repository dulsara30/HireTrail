import { create } from 'zustand';

export type PanelMode = 'create' | 'view' | 'ai-preview';

interface PanelState {
  isOpen: boolean;
  mode: PanelMode;
  applicationId: string | null;
  aiDraft: Record<string, unknown> | null;
  openCreate: () => void;
  openView: (id: string) => void;
  openAiPreview: (draft: Record<string, unknown>) => void;
  close: () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  isOpen: false,
  mode: 'view',
  applicationId: null,
  aiDraft: null,
  openCreate: () => set({ isOpen: true, mode: 'create', applicationId: null, aiDraft: null }),
  openView: (id: string) => set({ isOpen: true, mode: 'view', applicationId: id, aiDraft: null }),
  openAiPreview: (draft: Record<string, unknown>) =>
    set({ isOpen: true, mode: 'ai-preview', applicationId: null, aiDraft: draft }),
  close: () => set({ isOpen: false, applicationId: null, aiDraft: null }),
}));
