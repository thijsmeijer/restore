import { useRouter } from 'expo-router';

import { OnboardingProfileScreen } from '@/features/onboarding/onboarding-profile-screen';
import { useProfile } from '@/features/onboarding/profile-context';

export default function ProfileRoute() {
  const profileState = useProfile();
  const router = useRouter();

  return (
    <OnboardingProfileScreen
      initialProfile={profileState.profile}
      onComplete={() => router.back()}
      onSave={profileState.save}
    />
  );
}
