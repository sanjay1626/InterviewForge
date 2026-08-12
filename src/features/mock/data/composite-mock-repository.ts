import type { Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { isGuestUserId } from '@/features/auth/data/guest-session';
import type { MockSession } from '../domain/session';
import { GuestMockRepository } from './guest-mock-repository';
import type {
  MockInterviewRepository,
  MockReportView,
  MockSessionSummary,
} from './mock-repository';
import { SupabaseMockRepository } from './supabase-mock-repository';

export class CompositeMockRepository implements MockInterviewRepository {
  private readonly guest = new GuestMockRepository();
  private readonly cloud: SupabaseMockRepository | null;

  constructor(client: TypedSupabaseClient | null) {
    this.cloud = client ? new SupabaseMockRepository(client) : null;
  }

  private pick(userId: string): MockInterviewRepository {
    if (isGuestUserId(userId) || !this.cloud) return this.guest;
    return this.cloud;
  }

  saveSession(userId: string, session: MockSession): Promise<Result<void>> {
    return this.pick(userId).saveSession(userId, session);
  }
  listSessions(userId: string, limit?: number): Promise<Result<MockSessionSummary[]>> {
    return this.pick(userId).listSessions(userId, limit);
  }
  getReport(userId: string, sessionId: string): Promise<Result<MockReportView | null>> {
    return this.pick(userId).getReport(userId, sessionId);
  }
}
