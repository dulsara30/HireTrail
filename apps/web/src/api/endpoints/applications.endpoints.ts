export const APPLICATION_ENDPOINTS = {
  list: '/applications',
  board: '/applications/board',
  lane: (statusId: string) => `/applications/board/lane/${statusId}`,
  create: '/applications',
  byId: (id: string) => `/applications/${id}`,
  move: (id: string) => `/applications/${id}/move`,
  archive: (id: string) => `/applications/${id}/archive`,
  restore: (id: string) => `/applications/${id}/restore`,
  delete: (id: string) => `/applications/${id}`,
  undoDelete: (id: string) => `/applications/${id}/undo-delete`,
  comments: (id: string) => `/applications/${id}/comments`,
  activities: (id: string) => `/applications/${id}/activities`,
} as const;
