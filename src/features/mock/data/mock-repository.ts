import type { Result } from '@/core/domain/result';
import type { MockConfig, MockInterviewType, MockLength } from '../domain/config';
import type { MockReport, MockSession, MockStatus } from '../domain/session';

export interface MockSessionSummary {
  id: string;
  role: string;
  type: MockInterviewType;
  length: MockLength;
  status: MockStatus;
  overallScore: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface MockReportView {
  config: MockConfig;
  status: MockStatus;
  report: MockReport | null;
  completedAt: string | null;
}

/**
 * Persists whole mock-interview sessions (including partial/abandoned ones) and
 * reads back summaries and reports. Cloud-backed for signed-in users; local for
 * guests.
 */
export interface MockInterviewRepository {
  saveSession(userId: string, session: MockSession): Promise<Result<void>>;
  listSessions(userId: string, limit?: number): Promise<Result<MockSessionSummary[]>>;
  getReport(userId: string, sessionId: string): Promise<Result<MockReportView | null>>;
}
