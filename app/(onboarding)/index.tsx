import { useRouter } from 'expo-router';

import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard';

export default function OnboardingScreen() {
  const router = useRouter();
  return (
    <OnboardingWizard onComplete={() => router.replace('/(app)/dashboard')} />
  );
}
