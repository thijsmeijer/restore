export function resolveProfileNavigation(
  status: 'loading' | 'ready' | 'error',
  hasProfile: boolean,
) {
  const ready = status === 'ready';
  return {
    loading: !ready,
    onboarding: ready && !hasProfile,
    application: ready && hasProfile,
  } as const;
}
