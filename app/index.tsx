import { Screen } from '@/core/ui';
import { LoadingView } from '@/core/ui';

/**
 * Boot splash. The root layout's gate redirects away from here once the session
 * and profile have resolved, so this only shows during initial load.
 */
export default function IndexScreen() {
  return (
    <Screen scroll={false} center>
      <LoadingView label="Preparing InterviewForge…" />
    </Screen>
  );
}
