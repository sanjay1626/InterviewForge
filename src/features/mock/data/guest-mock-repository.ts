import { LocalCollection } from '@/core/data/local-collection';
import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { MockSession } from '../domain/session';
import type {
  MockInterviewRepository,
  MockReportView,
  MockSessionSummary,
} from './mock-repository';

/** Local mock-interview storage for guest mode (full session aggregate). */
export class GuestMockRepository implements MockInterviewRepository {
  private readonly collection = new LocalCollection<MockSession>(
    'interviewforge.guest.mock_sessions',
  );

  async saveSession(_userId: string, session: MockSession): Promise<Result<void>> {
    try {
      await this.collection.upsert(session);
      return ok(undefined);
    } catch (cause) {
      return err(makeError('unknown', 'Could not save the session locally.', { cause }));
    }
  }

  async listSessions(
    _userId: string,
    limit = 25,
  ): Promise<Result<MockSessionSummary[]>> {
    try {
      const all = await this.collection.list();
      const sorted = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return ok(
        sorted.slice(0, limit).map((s) => ({
          id: s.id,
          role: s.config.targetRole,
          type: s.config.type,
          length: s.config.length,
          status: s.status,
          overallScore: s.report?.overallScore ?? null,
          createdAt: s.createdAt,
          completedAt: s.completedAt,
        })),
      );
    } catch (cause) {
      return err(makeError('unknown', 'Could not read local sessions.', { cause }));
    }
  }

  async getReport(
    _userId: string,
    sessionId: string,
  ): Promise<Result<MockReportView | null>> {
    try {
      const s = await this.collection.get(sessionId);
      if (!s) return ok(null);
      return ok({
        config: s.config,
        status: s.status,
        report: s.report,
        completedAt: s.completedAt,
      });
    } catch (cause) {
      return err(makeError('unknown', 'Could not read the session.', { cause }));
    }
  }
}
