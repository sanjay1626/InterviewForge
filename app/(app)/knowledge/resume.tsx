import { useState } from 'react';
import { View } from 'react-native';

import { env } from '@/core/config/env';
import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Card,
  EmptyView,
  ErrorView,
  LoadingView,
  Screen,
  Subtitle,
  Title,
  spacing,
  useTheme,
} from '@/core/ui';
import { useAuthStore } from '@/features/auth/store/auth-store';
import type { DocumentRecord, DocumentStatus } from '@/features/knowledge/domain/types';
import {
  useDeleteDocument,
  useDocuments,
  useReingestDocument,
  useUploadResume,
} from '@/features/knowledge/hooks/useDocuments';
import { pickResume } from '@/features/knowledge/services/pick-resume';

const STATUS_COPY: Record<DocumentStatus, string> = {
  pending: 'Queued',
  processing: 'Analyzing…',
  ready: 'Analyzed',
  failed: 'Failed',
};

function statusColor(status: DocumentStatus, theme: ReturnType<typeof useTheme>) {
  if (status === 'ready') return theme.success;
  if (status === 'failed') return theme.danger;
  return theme.warning;
}

function DocumentCard({ doc }: { doc: DocumentRecord }) {
  const theme = useTheme();
  const reingest = useReingestDocument();
  const remove = useDeleteDocument();

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Subtitle>{doc.title}</Subtitle>
        <Caption style={{ color: statusColor(doc.status, theme), fontWeight: '700' }}>
          {STATUS_COPY[doc.status].toUpperCase()}
        </Caption>
      </View>
      <Caption>
        {doc.charCount.toLocaleString()} characters
        {doc.status === 'ready' ? ` · ${doc.chunkCount} searchable chunks` : ''}
      </Caption>
      {doc.status === 'failed' && doc.error ? (
        <Caption style={{ color: theme.danger }}>{doc.error}</Caption>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        {doc.status === 'failed' ? (
          <View style={{ flex: 1 }}>
            <Button
              title="Re-analyze"
              variant="secondary"
              loading={reingest.isPending}
              onPress={() => reingest.mutate(doc.id)}
            />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button
            title="Delete"
            variant="ghost"
            loading={remove.isPending}
            onPress={() => remove.mutate(doc.id)}
          />
        </View>
      </View>
    </Card>
  );
}

export default function ResumeScreen() {
  const theme = useTheme();
  const isGuest = useAuthStore((s) => s.session?.user.mode === 'guest');
  const documents = useDocuments();
  const upload = useUploadResume();
  const [pickError, setPickError] = useState<string | null>(null);

  const onUpload = async () => {
    setPickError(null);
    const picked = await pickResume();
    if (!picked.ok) {
      setPickError(toUserMessage(picked.error));
      return;
    }
    if (!picked.value) return; // cancelled
    upload.mutate(picked.value);
  };

  const disabledForGuest = isGuest || !env.isSupabaseConfigured;

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          {pickError ? (
            <Caption style={{ color: theme.danger }}>{pickError}</Caption>
          ) : null}
          {upload.isError ? (
            <Caption style={{ color: theme.danger }}>
              {toUserMessage(upload.error)}
            </Caption>
          ) : null}
          <Button
            title={disabledForGuest ? 'Sign in to upload a resume' : 'Upload resume (.pdf, .txt, .md)'}
            onPress={onUpload}
            loading={upload.isPending}
            disabled={disabledForGuest}
          />
          <Caption>
            PDF, plain-text, and Markdown resumes are supported. PDFs are parsed
            on our server; scanned/image-only PDFs won’t have readable text —
            use a text-based PDF or a .txt export. Word (.docx) is coming later.
          </Caption>
        </View>
      }
    >
      <Title>Resume</Title>
      <Body muted>
        Upload a resume to build a searchable base of your real experience. It is
        stored privately and only used to ground your practice answers.
      </Body>

      {documents.isLoading ? (
        <LoadingView label="Loading documents…" />
      ) : documents.isError ? (
        <ErrorView
          message={toUserMessage(documents.error)}
          onRetry={() => documents.refetch()}
        />
      ) : (documents.data?.length ?? 0) === 0 ? (
        <EmptyView
          title="No documents yet"
          message={
            disabledForGuest
              ? 'Create an account to upload and analyze your resume.'
              : 'Upload your resume to get started.'
          }
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {documents.data?.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </View>
      )}
    </Screen>
  );
}
