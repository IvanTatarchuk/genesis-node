// Auto-generate this file from Supabase CLI:
//   npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
//
// Updated to match all migrations (001 through 013).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TaskStatus        = "pending" | "running" | "completed" | "failed" | "cancelled";
export type LogType           = "thought" | "action" | "result" | "error" | "system";
export type TxnType           = "purchase" | "task_charge" | "refund" | "bonus" | "boost" | "reward" | "welcome" | "donation";
export type UserRole          = "dev" | "client";
export type SubscriptionTier  = "free" | "starter" | "pro" | "agency";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:                              string;
          role:                            UserRole;
          display_name:                    string | null;
          avatar_url:                      string | null;
          balance:                         number;
          stripe_customer_id:              string | null;
          subscription_tier:               SubscriptionTier;
          subscription_id:                 string | null;
          subscription_ends:               string | null;
          onboarding_done:                 boolean;
          referral_code:                   string | null;
          referred_by:                     string | null;
          streak_days:                     number;
          last_active_date:                string | null;
          total_earned:                    number;
          trinity_viewer_active:           boolean;
          trinity_viewer_subscription_id:  string | null;
          trinity_viewer_ends:             string | null;
          verified_developer:             boolean;
          created_at:                      string;
          updated_at:                      string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
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
          is_boosted:             boolean;
          boost_ends_at:          string | null;
          tags:                   string[];
          cover_image_url:        string | null;
          total_tasks_completed:  number;
          avg_rating:             number | null;
          avg_completion_seconds: number | null;
          category_slug:          string | null;
          health_status:          string | null;
          health_checked_at:      string | null;
          verified:               boolean;
          screenshots:            string[];
          created_at:             string;
          updated_at:             string;
        };
        Insert: Omit<Database["public"]["Tables"]["agents"]["Row"], "id" | "created_at" | "updated_at" | "total_tasks_completed">;
        Update: Partial<Database["public"]["Tables"]["agents"]["Row"]>;
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
          user_id:      string;
          profile_id:   string | null;
          amount:       number;
          type:         TxnType;
          reference_id: string | null;
          description:  string | null;
          created_at:   string;
        };
        Insert: Omit<Database["public"]["Tables"]["credit_transactions"]["Row"], "id" | "created_at">;
        Update: never;
      };
      agent_reviews: {
        Row: {
          id:          string;
          agent_id:    string;
          reviewer_id: string;
          rating:      number;
          comment:     string | null;
          created_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_reviews"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["agent_reviews"]["Row"]>;
      };
      agent_pipelines: {
        Row: {
          id:            string;
          creator_id:    string;
          name:          string;
          slug:          string;
          description:   string | null;
          steps:         Json;
          price_per_run: number;
          is_active:     boolean;
          created_at:    string;
          updated_at:    string;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_pipelines"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["agent_pipelines"]["Row"]>;
      };
      notifications: {
        Row: {
          id:         string;
          user_id:    string;
          title:      string;
          body:       string | null;
          type:       string;
          read:       boolean;
          link:       string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
      leaderboard_rewards: {
        Row: {
          id:          string;
          user_id:     string;
          reward_type: string;
          rank:        number;
          credits:     number;
          period:      string;
          created_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["leaderboard_rewards"]["Row"], "id" | "created_at">;
        Update: never;
      };
      trinity_state: {
        Row: {
          agent_name: string;
          status:     string;
          last_run:   string | null;
          metadata:   Json | null;
        };
        Insert: Database["public"]["Tables"]["trinity_state"]["Row"];
        Update: Partial<Database["public"]["Tables"]["trinity_state"]["Row"]>;
      };
      trinity_memory: {
        Row: {
          id:         string;
          agent_name: string;
          key:        string;
          value:      Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["trinity_memory"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["trinity_memory"]["Row"]>;
      };
      trinity_messages: {
        Row: {
          id:         string;
          from_agent: string;
          to_agent:   string | null;
          content:    string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["trinity_messages"]["Row"], "id" | "created_at">;
        Update: never;
      };
      trinity_reports: {
        Row: {
          id:          string;
          agent_name:  string;
          report_type: string;
          content:     string;
          created_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["trinity_reports"]["Row"], "id" | "created_at">;
        Update: never;
      };
      trinity_cycles: {
        Row: {
          id:          string;
          agent_name:  string;
          cycle_type:  string;
          started_at:  string;
          ended_at:    string | null;
          status:      string;
          summary:     string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["trinity_cycles"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["trinity_cycles"]["Row"]>;
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
      record_health_check: {
        Args: { p_agent_id: string; p_ok: boolean; p_response_ms: number | null; p_error: string | null };
        Returns: void;
      };
    };
  };
}

// Convenience row types
export type Profile            = Database["public"]["Tables"]["profiles"]["Row"];
export type Agent              = Database["public"]["Tables"]["agents"]["Row"];
export type Task               = Database["public"]["Tables"]["tasks"]["Row"];
export type Log                = Database["public"]["Tables"]["logs"]["Row"];
export type CreditTransaction  = Database["public"]["Tables"]["credit_transactions"]["Row"];
export type AgentReview        = Database["public"]["Tables"]["agent_reviews"]["Row"];
export type Notification       = Database["public"]["Tables"]["notifications"]["Row"];
