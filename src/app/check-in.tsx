import { useRouter } from 'expo-router';

import { CheckInFormScreen } from '@/features/check-in/check-in-form-screen';
import { useCheckIns } from '@/features/check-in/check-in-context';
import { useProfile } from '@/features/onboarding/profile-context';

export default function CheckInRoute() {
  const router = useRouter();
  const checkIns = useCheckIns();
  const profile = useProfile();

  return (
    <CheckInFormScreen
      onCancel={() => router.back()}
      onComplete={() => router.back()}
      onSubmit={checkIns.submit}
      profile={profile.profile}
    />
  );
}
