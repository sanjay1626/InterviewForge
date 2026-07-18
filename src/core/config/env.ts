/**
 * Environment access. Only `EXPO_PUBLIC_*` variables are inlined into the app
 * bundle by Expo, so this is the single safe place to read configuration.
 *
 * No secrets are hard-coded. When Supabase is not configured the app still
 * runs in guest-only mode (useful for local demos and Expo Go without a
 * backend), and every cloud-backed feature degrades gracefully.
 */

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const rawAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

function isValidUrl(value: string): boolean {
  if (!value) return false;
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export const env = {
  supabaseUrl: rawUrl,
  supabaseAnonKey: rawAnonKey,
  /** True only when both values are present and the URL parses. */
  isSupabaseConfigured: isValidUrl(rawUrl) && rawAnonKey.length > 0,
} as const;

export type Env = typeof env;
