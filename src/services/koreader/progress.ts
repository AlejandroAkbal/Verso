export function normalizeRemotePercentage(percentage: number | null | undefined): number {
  return typeof percentage === 'number' && Number.isFinite(percentage)
    ? Math.min(1, Math.max(0, percentage))
    : 0;
}
