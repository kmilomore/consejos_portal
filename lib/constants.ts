export const STORAGE_KEYS = {
  SELECTED_RBD: "consejos.portal.selected-rbd",
  AUTH_STATE: "consejos.portal.auth-state.v1",
  SNAPSHOT_VERSION: "consejos.portal.snapshot.version",
  SLEP_DIRECTORIO: (userId: string) => `consejos.slep-directorio.${userId}`,
  SNAPSHOT: (cacheKey: string) => `consejos.portal.snapshot.${cacheKey}`,
} as const;
