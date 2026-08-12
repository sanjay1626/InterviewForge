/**
 * Typed Supabase schema. Hand-maintained to keep responses typed without a
 * codegen step. Regenerate later with:
 *   supabase gen types typescript --project-id <ref> > src/core/supabase/database.types.ts
 *
 * Tables: user_profiles (Phase 1); documents, document_chunks,
 * work_experiences, projects (Phase 2).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamps = {
  created_at: string;
  updated_at: string;
};

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
          skills: string[];
          certifications: string[];
        } & Timestamps;
        Insert: {
          id: string;
          display_name?: string | null;
          target_role?: string | null;
          experience_level?: string | null;
          industry?: string | null;
          interview_goals?: string[];
          preferred_practice_mode?: string | null;
          onboarding_completed?: boolean;
          skills?: string[];
          certifications?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_type: 'resume' | 'notes' | 'other';
          mime_type: string | null;
          storage_path: string | null;
          status: 'pending' | 'processing' | 'ready' | 'failed';
          error: string | null;
          char_count: number;
          chunk_count: number;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          source_type?: 'resume' | 'notes' | 'other';
          mime_type?: string | null;
          storage_path?: string | null;
          status?: 'pending' | 'processing' | 'ready' | 'failed';
          error?: string | null;
          char_count?: number;
          chunk_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
        Relationships: [];
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          chunk_index: number;
          content: string;
          token_count: number | null;
          embedding: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id: string;
          chunk_index: number;
          content: string;
          token_count?: number | null;
          embedding?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['document_chunks']['Insert']>;
        Relationships: [];
      };
      work_experiences: {
        Row: {
          id: string;
          user_id: string;
          company: string;
          title: string;
          location: string | null;
          start_date: string | null;
          end_date: string | null;
          is_current: boolean;
          description: string | null;
          highlights: string[];
          skills: string[];
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          company: string;
          title: string;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_current?: boolean;
          description?: string | null;
          highlights?: string[];
          skills?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['work_experiences']['Insert']>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          role: string | null;
          description: string | null;
          highlights: string[];
          skills: string[];
          link: string | null;
          start_date: string | null;
          end_date: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          role?: string | null;
          description?: string | null;
          highlights?: string[];
          skills?: string[];
          link?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
        Relationships: [];
      };
      star_stories: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          situation: string | null;
          task: string | null;
          action: string | null;
          result: string | null;
          lesson: string | null;
          skills: string[];
          competencies: string[];
          company: string | null;
          project: string | null;
          tags: string[];
          status: 'draft' | 'needs_details' | 'ready';
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          situation?: string | null;
          task?: string | null;
          action?: string | null;
          result?: string | null;
          lesson?: string | null;
          skills?: string[];
          competencies?: string[];
          company?: string | null;
          project?: string | null;
          tags?: string[];
          status?: 'draft' | 'needs_details' | 'ready';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['star_stories']['Insert']>;
        Relationships: [];
      };
      behavioral_questions: {
        Row: {
          id: string;
          competency: string;
          prompt: string;
          is_foundational: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          competency: string;
          prompt: string;
          is_foundational?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['behavioral_questions']['Insert']>;
        Relationships: [];
      };
      practice_sessions: {
        Row: {
          id: string;
          user_id: string;
          mode: 'text' | 'voice' | 'guided' | 'mock';
          status: 'active' | 'completed';
          question_count: number;
          started_at: string;
          completed_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          mode?: 'text' | 'voice' | 'guided' | 'mock';
          status?: 'active' | 'completed';
          question_count?: number;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['practice_sessions']['Insert']>;
        Relationships: [];
      };
      practice_answers: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string;
          question_id: string | null;
          question_text: string;
          competency: string | null;
          answer_text: string;
          mode: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id: string;
          question_id?: string | null;
          question_text: string;
          competency?: string | null;
          answer_text: string;
          mode?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['practice_answers']['Insert']>;
        Relationships: [];
      };
      answer_evaluations: {
        Row: {
          id: string;
          answer_id: string;
          user_id: string;
          overall_score: number;
          scores: Json;
          strengths: string[];
          missing_details: string[];
          unsupported_claims: string[];
          suggested_followups: string[];
          recommendations: string[];
          improved_answer: string | null;
          facts_used: string[];
          missing_info: string[];
          change_explanation: string | null;
          source: 'ai' | 'offline';
          created_at: string;
        };
        Insert: {
          id?: string;
          answer_id: string;
          user_id: string;
          overall_score?: number;
          scores?: Json;
          strengths?: string[];
          missing_details?: string[];
          unsupported_claims?: string[];
          suggested_followups?: string[];
          recommendations?: string[];
          improved_answer?: string | null;
          facts_used?: string[];
          missing_info?: string[];
          change_explanation?: string | null;
          source?: 'ai' | 'offline';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['answer_evaluations']['Insert']>;
        Relationships: [];
      };
      follow_up_answers: {
        Row: {
          id: string;
          answer_id: string | null;
          user_id: string;
          prompt: string;
          response: string;
          overall_score: number;
          feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          answer_id?: string | null;
          user_id: string;
          prompt: string;
          response: string;
          overall_score?: number;
          feedback?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['follow_up_answers']['Insert']>;
        Relationships: [];
      };
      mock_interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          config: Json;
          status: 'in_progress' | 'completed' | 'abandoned';
          plan: Json;
          question_count: number;
          started_at: string;
          completed_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          config?: Json;
          status?: 'in_progress' | 'completed' | 'abandoned';
          plan?: Json;
          question_count?: number;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mock_interview_sessions']['Insert']>;
        Relationships: [];
      };
      mock_interview_questions: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          order_index: number;
          kind: string | null;
          competency: string | null;
          prompt: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          order_index?: number;
          kind?: string | null;
          competency?: string | null;
          prompt: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mock_interview_questions']['Insert']>;
        Relationships: [];
      };
      mock_interview_answers: {
        Row: {
          id: string;
          session_id: string;
          question_id: string | null;
          user_id: string;
          order_index: number;
          question_text: string;
          kind: string | null;
          competency: string | null;
          transcript: string;
          mode: string;
          duration_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id?: string | null;
          user_id: string;
          order_index?: number;
          question_text: string;
          kind?: string | null;
          competency?: string | null;
          transcript?: string;
          mode?: string;
          duration_ms?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mock_interview_answers']['Insert']>;
        Relationships: [];
      };
      mock_interview_followups: {
        Row: {
          id: string;
          session_id: string;
          answer_id: string | null;
          user_id: string;
          prompt: string;
          response: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          answer_id?: string | null;
          user_id: string;
          prompt: string;
          response?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mock_interview_followups']['Insert']>;
        Relationships: [];
      };
      mock_interview_reports: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          overall_score: number;
          report: Json;
          source: 'ai' | 'offline';
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          overall_score?: number;
          report?: Json;
          source?: 'ai' | 'offline';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mock_interview_reports']['Insert']>;
        Relationships: [];
      };
      user_progress: {
        Row: {
          user_id: string;
          questions_practiced: number;
          sessions_completed: number;
          average_score: number;
          competency_scores: Json;
          last_practiced_at: string | null;
          streak_days: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          questions_practiced?: number;
          sessions_completed?: number;
          average_score?: number;
          competency_scores?: Json;
          last_practiced_at?: string | null;
          streak_days?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_progress']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_document_chunks: {
        Args: { query_embedding: string; match_count?: number };
        Returns: {
          id: string;
          document_id: string;
          content: string;
          chunk_index: number;
          similarity: number;
        }[];
      };
    };
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
