import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { ResumeUpload } from '../domain/types';

const TEXT_EXT = /\.(txt|md|markdown)$/i;

/**
 * Opens the document picker for a TXT/Markdown resume and reads its contents on
 * device. Returns `null` when the user cancels. PDF/DOCX are intentionally not
 * parsed in the MVP — those are rejected with a clear message.
 */
export async function pickResume(): Promise<Result<ResumeUpload | null>> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/plain', 'text/markdown'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return ok(null);

    const asset = res.assets[0];
    if (!asset) return ok(null);

    const looksText =
      TEXT_EXT.test(asset.name ?? '') ||
      (asset.mimeType ?? '').startsWith('text/');
    if (!looksText) {
      return err(
        makeError(
          'validation',
          'Only .txt or .md resumes are supported for now. PDF and DOCX parsing is coming in a later release.',
        ),
      );
    }

    const text = await new File(asset.uri).text();
    if (!text.trim()) {
      return err(makeError('validation', 'That file appears to be empty.'));
    }

    return ok({
      title: (asset.name ?? 'Resume').replace(TEXT_EXT, ''),
      fileName: asset.name ?? 'resume.txt',
      mimeType: asset.mimeType ?? 'text/plain',
      text,
    });
  } catch (cause) {
    return err(makeError('unknown', 'Could not read the selected file.', { cause }));
  }
}
