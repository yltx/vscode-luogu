export type BenbenMode = string | 1 | 2;

export const benbenModeRequiresLogin = (mode: BenbenMode) =>
  mode === 1 || mode === 2;
