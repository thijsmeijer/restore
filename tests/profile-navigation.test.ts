import { resolveProfileNavigation } from '@/features/onboarding/profile-route-guards';

describe('profile navigation gate', () => {
  it('shows onboarding only when local profile loading completes without a profile', () => {
    expect(resolveProfileNavigation('loading', false)).toEqual({
      loading: true,
      onboarding: false,
      application: false,
    });
    expect(resolveProfileNavigation('ready', false)).toEqual({
      loading: false,
      onboarding: true,
      application: false,
    });
  });

  it('does not repeat onboarding after a stored profile is loaded', () => {
    expect(resolveProfileNavigation('ready', true)).toEqual({
      loading: false,
      onboarding: false,
      application: true,
    });
    expect(resolveProfileNavigation('error', false)).toEqual({
      loading: true,
      onboarding: false,
      application: false,
    });
  });
});
