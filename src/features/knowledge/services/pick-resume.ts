import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { ResumeUpload } from '../domain/types';

const TEXT_EXT = /\.(txt|md|markdown)$/i;
const RESUME_EXT = /\.(txt|md|markdown|pdf)$/i;

/**
 * Opens the document picker for a resume. TXT/Markdown are read on-device and
 * sent inline; PDF is read as raw bytes and parsed server-side after upload.
 * Returns `null` when the user cancels. Other formats (e.g. DOCX) are rejected
 * with a clear message.
 */
export async function pickResume(): Promise<Result<ResumeUpload | null>> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/plain', 'text/markdown', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return ok(null);

    const asset = res.assets[0];
    if (!asset) return ok(null);

    const name = asset.name ?? 'Resume';
    const mime = asset.mimeType ?? '';
    const isPdf = /\.pdf$/i.test(name) || mime.includes('pdf');
    const isText = TEXT_EXT.test(name) || mime.startsWith('text/');

    if (!isPdf && !isText) {
      return err(
        makeError(
          'validation',
          'Supported resume formats are .txt, .md, and .pdf. Word (.docx) support is coming later.',
        ),
      );
    }

    const file = new File(asset.uri);
    const base64 = await file.base64();
    if (!base64) {
      return err(makeError('validation', 'That file appears to be empty.'));
    }

    // TXT/MD: read text on-device so ingestion can skip a download round-trip.
    let text: string | null = null;
    if (isText) {
      text = await file.text();
      if (!text.trim()) {
        return err(makeError('validation', 'That file appears to be empty.'));
      }
    }

    return ok({
      title: name.replace(RESUME_EXT, ''),
      fileName: name,
      mimeType: mime || (isPdf ? 'application/pdf' : 'text/plain'),
      text,
      base64,
    });
  } catch (cause) {
    return err(makeError('unknown', 'Could not read the selected file.', { cause }));
  }
}
