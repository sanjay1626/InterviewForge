import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { createQueryClient } from '@/core/query/queryClient';
import { ErrorBoundary } from '@/core/ui';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { ProfileProvider } from '@/features/onboarding/ProfileProvider';
import { useProfile } from '@/features/onboarding/hooks/useProfile';
import { KnowledgeProvider } from '@/features/knowledge/KnowledgeProvider';
import { StoriesProvider } from '@/features/stories/StoriesProvider';
import { PracticeProvider } from '@/features/practice/PracticeProvider';
import { MockProvider } from '@/features/mock/MockProvider';

const queryClient = createQueryClient();

/**
 * Central auth/onboarding gate. Redirects based on session status and whether
 * the user's profile (onboarding) exists. Runs inside the providers so it can
 * read the session store and profile query.
 */
function useProtectedRoute() {
  const router = useRouter();
  const segments = useSegments();
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useProfile(userId);

  useEffect(() => {
    if (status === 'loading') return;

    const group = segments[0];
    // The index route (`/`) is only a boot splash — never a resting place.
    const onIndex = group === undefined;
    const inAuthFlow = group === '(auth)' || group === 'welcome';
    const inOnboarding = group === '(onboarding)';

    if (status === 'signedOut') {
      // Signed-out users belong in the auth flow; push them off the splash.
      if (!inAuthFlow) router.replace('/welcome');
      return;
    }

    // Authenticated: wait for the profile query to settle before deciding.
    if (profile.isLoading) return;

    const needsOnboarding = !profile.data?.onboardingCompleted;

    if (needsOnboarding) {
      if (!inOnboarding) router.replace('/(onboarding)');
      return;
    }

    // Fully onboarded — keep them out of the splash/auth/onboarding funnels.
    if (onIndex || inAuthFlow || inOnboarding) {
      router.replace('/(app)/dashboard');
    }
  }, [status, segments, profile.isLoading, profile.data, router]);
}

function RootNavigation() {
  useProtectedRoute();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="mock" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ProfileProvider>
              <KnowledgeProvider>
                <StoriesProvider>
                  <PracticeProvider>
                    <MockProvider>
                      <ErrorBoundary>
                        <StatusBar style="auto" />
                        <RootNavigation />
                      </ErrorBoundary>
                    </MockProvider>
                  </PracticeProvider>
                </StoriesProvider>
              </KnowledgeProvider>
            </ProfileProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
