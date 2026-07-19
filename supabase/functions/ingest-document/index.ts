// Supabase Edge Function: ingest-document
//
// Parses a user's uploaded TXT/Markdown document into searchable chunks and
// (optionally) embeddings, then stores them in `document_chunks`.
//
// Runs with the CALLER'S JWT (forwarded Authorization header), so all reads and
// writes are constrained by Row-Level Security — no service-role key is used.
//
// Request:  POST { documentId: string, text?: string }
//   - If `text` is provided it is ingested directly (handy for Expo Go, which
//     can read a picked file's contents locally).
//   - Otherwise the function downloads the file from the document's storage_path.
//
// Embeddings are generated only when EMBEDDINGS_API_KEY is configured; without
// it, chunks are still stored (embedding = null) so the feature degrades
// gracefully. See docs/SUPABASE_SETUP.md.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMBEDDINGS_URL =
  Deno.env.get('EMBEDDINGS_URL') ?? 'https://api.openai.com/v1/embeddings';
const EMBEDDINGS_MODEL =
  Deno.env.get('EMBEDDINGS_MODEL') ?? 'text-embedding-3-small';
const EMBEDDINGS_API_KEY = Deno.env.get('EMBEDDINGS_API_KEY') ?? '';
const EMBEDDING_DIM = 1536;

const MAX_CHARS = 1000;
const OVERLAP = 150;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Split text into overlapping, roughly paragraph-aligned chunks. */
function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  const push = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = '';
  };

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length <= MAX_CHARS) {
      current = current ? current + '\n\n' + para : para;
      continue;
    }
    push();
    if (para.length <= MAX_CHARS) {
      current = para;
    } else {
      // Hard-split an oversized paragraph with overlap.
      for (let i = 0; i < para.length; i += MAX_CHARS - OVERLAP) {
        chunks.push(para.slice(i, i + MAX_CHARS).trim());
      }
    }
  }
  push();
  return chunks;
}

/** Generate embeddings for chunks, or null when no provider is configured. */
async function embedChunks(chunks: string[]): Promise<(number[] | null)[]> {
  if (!EMBEDDINGS_API_KEY || chunks.length === 0) {
    return chunks.map(() => null);
  }
  const res = await fetch(EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${EMBEDDINGS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDINGS_MODEL, input: chunks }),
  });
  if (!res.ok) {
    throw new Error(`Embeddings provider error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data.map((d) => {
    if (d.embedding.length !== EMBEDDING_DIM) {
      throw new Error(
        `Embedding dim ${d.embedding.length} != expected ${EMBEDDING_DIM}. ` +
          `Update EMBEDDINGS_MODEL or the vector() size in migration 0002.`,
      );
    }
    return d.embedding;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  let documentId: string;
  let inlineText: string | undefined;
  try {
    const body = await req.json();
    documentId = body.documentId;
    inlineText = body.text;
    if (!documentId) throw new Error('documentId is required');
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  // Load the document (RLS ensures the caller owns it).
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();
  if (docErr || !doc) return json({ error: 'Document not found' }, 404);

  await supabase
    .from('documents')
    .update({ status: 'processing', error: null })
    .eq('id', documentId);

  try {
    let text = inlineText ?? '';
    if (!text && doc.storage_path) {
      const { data: file, error: dlErr } = await supabase.storage
        .from('documents')
        .download(doc.storage_path);
      if (dlErr || !file) throw new Error('Could not download file from storage');
      text = await file.text();
    }
    if (!text.trim()) throw new Error('Document has no readable text');

    const chunks = chunkText(text);
    const embeddings = await embedChunks(chunks);

    // Replace any prior chunks for idempotent re-ingestion.
    await supabase.from('document_chunks').delete().eq('document_id', documentId);

    const rows = chunks.map((content, i) => ({
      document_id: documentId,
      user_id: doc.user_id,
      chunk_index: i,
      content,
      token_count: Math.ceil(content.length / 4),
      embedding: embeddings[i],
    }));

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('document_chunks').insert(rows);
      if (insErr) throw new Error(`Failed to store chunks: ${insErr.message}`);
    }

    await supabase
      .from('documents')
      .update({
        status: 'ready',
        char_count: text.length,
        chunk_count: rows.length,
        error: null,
      })
      .eq('id', documentId);

    return json({
      ok: true,
      documentId,
      chunkCount: rows.length,
      embedded: Boolean(EMBEDDINGS_API_KEY),
    });
  } catch (e) {
    const message = (e as Error).message ?? 'Ingestion failed';
    await supabase
      .from('documents')
      .update({ status: 'failed', error: message })
      .eq('id', documentId);
    return json({ error: message }, 500);
  }
});
