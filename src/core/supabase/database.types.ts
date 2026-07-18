/**
 * Typed Supabase schema. Hand-maintained for Phase 1 to keep responses typed
 * without a codegen step. Regenerate later with:
 *   supabase gen types typescript --project-id <ref> > src/core/supabase/database.types.ts
 *
 * Only tables introduced in Phase 1 are declared here (user_profiles).
 * Later phases append their tables to this same `Database` type.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          target_role: string | null;
          experience_level: string | null;
          industry: string | null;
          interview_goals: string[];
          preferred_practice_mode: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          target_role?: string | null;
          experience_level?: string | null;
          industry?: string | null;
          interview_goals?: string[];
          preferred_practice_mode?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          target_role?: string | null;
          experience_level?: string | null;
          industry?: string | null;
          interview_goals?: string[];
          preferred_practice_mode?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
