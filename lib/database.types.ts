// Auto-generate this file from Supabase CLI:
//   npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
//
// The types below are hand-authored to match 001_initial_schema.sql and serve
// as a source of truth until the CLI generates them.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TaskStatus        = "pending" | "running" | "completed" | "failed" | "cancelled";
export type LogType           = "thought" | "action" | "result" | "error" | "system";
export type TxnType           = "purchase" | "task_charge" | "refund" | "bonus";
export type UserRole          = "dev" | "client";
export type SubscriptionTier  = "free" | "starter" | "pro" | "agency";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:                 string;
          role:               UserRole;
          display_name:       string | null;
          avatar_url:         string | null;
          balance:             number;
          stripe_customer_id:  string | null;
          subscription_tier:   SubscriptionTier;
          subscription_id:     string | null;
          subscription_ends:   string | null;
          created_at:          string;
          updated_at:          string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      agents: {
        Row: {
          id:                     string;
          creator_id:             string;
          name:                   string;
          slug:                   string;
          description:            string;
          long_description:       string | null;
          config_blob:            Json;
          price_per_task:         number;
          is_active:              boolean;
          is_featured:            boolean;
          tags:                   string[];
          cover_image_url:        string | null;
          total_tasks_completed:  number;
          avg_completion_seconds: number | null;
          created_at:             string;
          updated_at:             string;
        };
        Insert: Omit<Database["public"]["Tables"]["agents"]["Row"], "id" | "created_at" | "updated_at" | "total_tasks_completed">;
        Update: Partial<Database["public"]["Tables"]["agents"]["Insert"]>;
      };
      tasks: {
        Row: {
          id:               string;
          client_id:        string;
          agent_id:         string;
          goal:             string;
          status:           TaskStatus;
          credits_charged:  number;
          result_url:       string | null;
          result_summary:   string | null;
          container_id:     string | null;
          started_at:       string | null;
          completed_at:     string | null;
          created_at:       string;
          updated_at:       string;
        };
        Insert: Pick<Database["public"]["Tables"]["tasks"]["Row"], "client_id" | "agent_id" | "goal">;
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
      };
      logs: {
        Row: {
          id:        string;
          task_id:   string;
          type:      LogType;
          content:   string;
          metadata:  Json;
          timestamp: string;
        };
        Insert: Omit<Database["public"]["Tables"]["logs"]["Row"], "id">;
        Update: never;
      };
      credit_transactions: {
        Row: {
          id:           string;
          profile_id:   string;
          amount:       number;
          type:         TxnType;
          reference_id: string | null;
          description:  string | null;
          created_at:   string;
        };
        Insert: Omit<Database["public"]["Tables"]["credit_transactions"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
    Functions: {
      charge_task: {
        Args: { p_task_id: string; p_client_id: string; p_credits: number };
        Returns: boolean;
      };
      refund_task: {
        Args: { p_task_id: string; p_client_id: string; p_credits: number };
        Returns: void;
      };
    };
  };
}

// Convenience row types
export type Profile           = Database["public"]["Tables"]["profiles"]["Row"];
export type Agent             = Database["public"]["Tables"]["agents"]["Row"];
export type Task              = Database["public"]["Tables"]["tasks"]["Row"];
export type Log               = Database["public"]["Tables"]["logs"]["Row"];
export type CreditTransaction = Database["public"]["Tables"]["credit_transactions"]["Row"];
