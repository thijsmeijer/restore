import { OnboardingProfileScreen } from '@/features/onboarding/onboarding-profile-screen';
import { useProfile } from '@/features/onboarding/profile-context';

export default function OnboardingRoute() {
  const profileState = useProfile();

  return (
    <OnboardingProfileScreen initialProfile={null} onSave={profileState.save} />
  );
}
