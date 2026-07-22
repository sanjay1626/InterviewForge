import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
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
  ProgressBar,
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
import { useExtractProfile } from '@/features/knowledge/hooks/useExtractProfile';
import { useExtractionStore } from '@/features/knowledge/store/extraction-store';
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

/** Stages of the automatic upload → analyze → extract pipeline. */
interface Progress {
  value: number;
  label: string;
  failed?: boolean;
  detail?: string;
}

export default function ResumeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const isGuest = useAuthStore((s) => s.session?.user.mode === 'guest');
  const documents = useDocuments();
  const upload = useUploadResume();
  const extract = useExtractProfile();
  const storeResult = useExtractionStore((s) => s.set);

  const [pickError, setPickError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  // Navigate to the review screen shortly after "Completed" so the user sees it.
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (navTimer.current) clearTimeout(navTimer.current);
    },
    [],
  );

  const runExtraction = (documentId: string) => {
    setProgress({ value: 0.7, label: 'Extracting experience, projects & skills…' });
    extract.mutate(documentId, {
      onSuccess: (result) => {
        const found =
          result.experiences.length +
          result.projects.length +
          result.skills.length +
          result.certifications.length;
        storeResult(documentId, result);
        setProgress({
          value: 1,
          label: 'Completed',
          detail: `Found ${found} item${found === 1 ? '' : 's'} — opening review…`,
        });
        navTimer.current = setTimeout(() => {
          setProgress(null);
          router.push(`/(app)/knowledge/review-extracted?documentId=${documentId}`);
        }, 900);
      },
      onError: (error) => {
        setProgress({
          value: 0.7,
          label: 'Extraction failed',
          failed: true,
          detail: toUserMessage(error),
        });
      },
    });
  };

  const onUpload = async () => {
    setPickError(null);
    setProgress(null);
    const picked = await pickResume();
    if (!picked.ok) {
      setPickError(toUserMessage(picked.error));
      return;
    }
    if (!picked.value) return; // cancelled

    setProgress({ value: 0.25, label: 'Uploading and analyzing your resume…' });
    upload.mutate(picked.value, {
      onSuccess: (doc) => {
        if (doc.status !== 'ready') {
          setProgress({
            value: 0.5,
            label: 'Analysis failed',
            failed: true,
            detail: doc.error ?? 'The resume could not be analyzed.',
          });
          return;
        }
        runExtraction(doc.id);
      },
      onError: (error) => {
        setProgress({
          value: 0.25,
          label: 'Upload failed',
          failed: true,
          detail: toUserMessage(error),
        });
      },
    });
  };

  const disabledForGuest = isGuest || !env.isSupabaseConfigured;

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          {pickError ? (
            <Caption style={{ color: theme.danger }}>{pickError}</Caption>
          ) : null}
          <Button
            title={disabledForGuest ? 'Sign in to upload a resume' : 'Upload resume (.pdf, .txt, .md)'}
            onPress={onUpload}
            loading={upload.isPending || extract.isPending}
            disabled={disabledForGuest || upload.isPending || extract.isPending}
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
        Upload a resume and we’ll pull out your work experience, projects, and
        skills automatically — you review everything before it’s saved.
      </Body>

      {progress ? (
        <Card>
          <ProgressBar
            progress={progress.value}
            label={progress.label}
            failed={progress.failed}
          />
          {progress.detail ? (
            <Caption style={progress.failed ? { color: theme.danger } : undefined}>
              {progress.detail}
            </Caption>
          ) : null}
          {progress.failed ? (
            <View style={{ marginTop: spacing.xs }}>
              <Button
                title="Dismiss"
                variant="ghost"
                fullWidth={false}
                onPress={() => setProgress(null)}
              />
            </View>
          ) : null}
        </Card>
      ) : null}

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
