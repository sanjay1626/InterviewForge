import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Card,
  Subtitle,
  TextField,
  Title,
  spacing,
  useTheme,
} from '@/core/ui';
import { useDocuments } from '@/features/knowledge/hooks/useDocuments';
import { useBuildPrep, usePrepList } from '@/features/prep/hooks/usePrep';
import { usePrepStore } from '@/features/prep/store/prep-store';

export default function PrepSetupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const build = useBuildPrep();
  const setPackage = usePrepStore((s) => s.setPackage);
  const documents = useDocuments();
  const recent = usePrepList();

  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [interviewDate, setInterviewDate] = useState('');

  const hasResume = (documents.data ?? []).some(
    (d) => d.sourceType === 'resume' && d.status === 'ready',
  );

  const canBuild = jobDescription.trim().length >= 40 && !build.isPending;

  const onBuild = () => {
    build.mutate(
      {
        input: {
          jobTitle: jobTitle.trim(),
          company: company.trim(),
          jobDescription: jobDescription.trim(),
          interviewDate: interviewDate.trim() || null,
        },
      },
      {
        onSuccess: (pkg) => {
          setPackage(pkg);
          router.replace('/prep/dashboard');
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={26} color={theme.text} />
        </Pressable>
        <Subtitle style={{ marginLeft: spacing.md }}>Prepare for an interview</Subtitle>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <Title>Build your prep in minutes</Title>
        <Body muted>
          Add the job description and we’ll build a personalized plan grounded in
          your real experience — likely questions, a job match, study topics, and
          readiness. No stories required first.
        </Body>

        {(recent.data ?? []).length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Caption style={{ color: theme.brand, fontWeight: '700' }}>RECENT PREP</Caption>
            {(recent.data ?? []).slice(0, 3).map((r) => (
              <Card
                key={r.id}
                accessibilityLabel={`Reopen prep for ${r.jobTitle}`}
                onPress={() =>
                  router.replace({ pathname: '/prep/dashboard', params: { savedId: r.id } })
                }
              >
                <Subtitle>{r.jobTitle}</Subtitle>
                {r.company ? <Caption>{r.company}</Caption> : null}
                <Caption style={{ color: theme.brand, fontWeight: '700' }}>Reopen →</Caption>
              </Card>
            ))}
          </View>
        ) : null}

        <Card>
          <Caption style={{ color: theme.brand, fontWeight: '700' }}>RESUME</Caption>
          {hasResume ? (
            <Body>✓ We’ll use the resume on file to ground your prep.</Body>
          ) : (
            <>
              <Body muted>
                No resume on file yet. You can still build prep from the job
                description — add a resume anytime for sharper, grounded results.
              </Body>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(app)/knowledge/resume')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Caption style={{ color: theme.brand, fontWeight: '700' }}>
                  Add a resume →
                </Caption>
              </Pressable>
            </>
          )}
        </Card>

        <TextField
          label="Job title"
          value={jobTitle}
          onChangeText={setJobTitle}
          placeholder="e.g. Senior QA Engineer"
        />
        <TextField
          label="Company (optional)"
          value={company}
          onChangeText={setCompany}
          placeholder="e.g. Globex"
        />
        <TextField
          label="Job description"
          hint="Paste the full posting for the best results."
          value={jobDescription}
          onChangeText={setJobDescription}
          multiline
          numberOfLines={8}
          style={{ minHeight: 180, paddingTop: spacing.md }}
          placeholder="Paste the job description here…"
        />
        <TextField
          label="Interview date (optional)"
          value={interviewDate}
          onChangeText={setInterviewDate}
          placeholder="e.g. 2026-08-25"
        />

        {build.isError ? (
          <Caption style={{ color: theme.danger }}>{toUserMessage(build.error)}</Caption>
        ) : null}
      </ScrollView>

      <View
        style={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.md,
          borderTopColor: theme.border,
          borderTopWidth: 1,
        }}
      >
        {jobDescription.trim().length > 0 && jobDescription.trim().length < 40 ? (
          <Caption style={{ color: theme.textMuted, marginBottom: spacing.sm }}>
            Add a bit more of the job description to continue.
          </Caption>
        ) : null}
        <Button
          title="Build My Interview Prep"
          onPress={onBuild}
          loading={build.isPending}
          disabled={!canBuild}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
