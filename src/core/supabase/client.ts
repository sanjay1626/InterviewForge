/**
 * Supabase client singleton, configured for React Native:
 *  - AsyncStorage for session persistence
 *  - autoRefreshToken + persistSession
 *  - detectSessionInUrl disabled (no browser redirect handling on native)
 *
 * The client is created lazily and only when Supabase is configured, so the app
 * boots in guest-only mode without a backend. Never import the service-role key
 * here — only the public anon key belongs in the app.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/core/config/env';
import type { Database } from './database.types';

export type TypedSupabaseClient = SupabaseClient<Database>;

let cached: TypedSupabaseClient | null = null;

export function getSupabaseClient(): TypedSupabaseClient | null {
  if (!env.isSupabaseConfigured) return null;
  if (cached) return cached;

  cached = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return cached;
}

/** Throwing accessor for code paths that require a backend to exist. */
export function requireSupabaseClient(): TypedSupabaseClient {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}
