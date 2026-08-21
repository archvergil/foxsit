/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          all_day: boolean
          category: string | null
          color_token: string
          created_at: string
          description: string | null
          end_at: string | null
          end_date: string | null
          id: string
          location: string | null
          start_at: string | null
          start_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          category?: string | null
          color_token?: string
          created_at?: string
          description?: string | null
          end_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          start_at?: string | null
          start_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          category?: string | null
          color_token?: string
          created_at?: string
          description?: string | null
          end_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          start_at?: string | null
          start_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          completed: boolean
          created_at: string
          ended_at: string
          focused_seconds: number
          focus_run_id: string | null
          id: string
          planned_seconds: number
          session_type: string
          started_at: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          ended_at: string
          focused_seconds: number
          focus_run_id?: string | null
          id?: string
          planned_seconds: number
          session_type: string
          started_at: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          ended_at?: string
          focused_seconds?: number
          focus_run_id?: string | null
          id?: string
          planned_seconds?: number
          session_type?: string
          started_at?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_task_owner_fk"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          count: number
          created_at: string
          habit_id: string
          id: string
          local_date: string
          note: string | null
          source: string | null
          source_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          habit_id: string
          id?: string
          local_date: string
          note?: string | null
          source?: string | null
          source_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          habit_id?: string
          id?: string
          local_date?: string
          note?: string | null
          source?: string | null
          source_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_owner_fk"
            columns: ["habit_id", "user_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      habits: {
        Row: {
          archived_at: string | null
          color_token: string
          custom_color: string | null
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          position: number
          project_id: string | null
          schedule_type: string
          target_count: number
          title: string
          unit: string | null
          updated_at: string
          user_id: string
          weekdays: number[] | null
        }
        Insert: {
          archived_at?: string | null
          color_token?: string
          custom_color?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          position?: number
          project_id?: string | null
          schedule_type?: string
          target_count?: number
          title: string
          unit?: string | null
          updated_at?: string
          user_id: string
          weekdays?: number[] | null
        }
        Update: {
          archived_at?: string | null
          color_token?: string
          custom_color?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          position?: number
          project_id?: string | null
          schedule_type?: string
          target_count?: number
          title?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "habits_project_owner_fk"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "habit_projects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      habit_projects: {
        Row: {
          banner_asset: string | null
          banner_monochrome: boolean
          color_token: string
          created_at: string
          custom_color: string | null
          icon: string | null
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          banner_asset?: string | null
          banner_monochrome?: boolean
          color_token?: string
          created_at?: string
          custom_color?: string | null
          icon?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          banner_asset?: string | null
          banner_monochrome?: boolean
          color_token?: string
          created_at?: string
          custom_color?: string | null
          icon?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          calendar_show_events: boolean
          calendar_show_habits: boolean
          calendar_show_tasks: boolean
          created_at: string
          display_name: string | null
          id: string
          theme: string
          timezone: string
          updated_at: string
          week_starts_on: number
        }
        Insert: {
          avatar_url?: string | null
          calendar_show_events?: boolean
          calendar_show_habits?: boolean
          calendar_show_tasks?: boolean
          created_at?: string
          display_name?: string | null
          id: string
          theme?: string
          timezone?: string
          updated_at?: string
          week_starts_on?: number
        }
        Update: {
          avatar_url?: string | null
          calendar_show_events?: boolean
          calendar_show_habits?: boolean
          calendar_show_tasks?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          theme?: string
          timezone?: string
          updated_at?: string
          week_starts_on?: number
        }
        Relationships: []
      }
      task_checklist_items: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          position: number
          task_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          position?: number
          task_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          position?: number
          task_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_task_owner_fk"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_projects: {
        Row: {
          archived_at: string | null
          banner_asset: string | null
          banner_monochrome: boolean
          color_token: string
          custom_color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_project_id: string | null
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          banner_asset?: string | null
          banner_monochrome?: boolean
          color_token?: string
          custom_color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_project_id?: string | null
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          banner_asset?: string | null
          banner_monochrome?: boolean
          color_token?: string
          custom_color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_project_id?: string | null
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_projects_parent_owner_fk"
            columns: ["parent_project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_projects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          due_at: string | null
          estimate_minutes: number | null
          id: string
          notes: string | null
          position: number
          priority: string
          project_id: string | null
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          estimate_minutes?: number | null
          id?: string
          notes?: string | null
          position?: number
          priority?: string
          project_id?: string | null
          scheduled_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          estimate_minutes?: number | null
          id?: string
          notes?: string | null
          position?: number
          priority?: string
          project_id?: string | null
          scheduled_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_owner_fk"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_projects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      workout_routine_exercises: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          muscle_group: string | null
          notes: string | null
          position: number
          rest_seconds: number
          routine_id: string
          target_reps_max: number
          target_reps_min: number
          target_sets: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          muscle_group?: string | null
          notes?: string | null
          position?: number
          rest_seconds?: number
          routine_id: string
          target_reps_max?: number
          target_reps_min?: number
          target_sets?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          muscle_group?: string | null
          notes?: string | null
          position?: number
          rest_seconds?: number
          routine_id?: string
          target_reps_max?: number
          target_reps_min?: number
          target_sets?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_routine_exercises_owner_fk"
            columns: ["routine_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_routines"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      workout_routines: {
        Row: {
          activity_type: string
          archived_at: string | null
          banner_asset: string | null
          banner_monochrome: boolean
          color_token: string
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          archived_at?: string | null
          banner_asset?: string | null
          banner_monochrome?: boolean
          color_token?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          archived_at?: string | null
          banner_asset?: string | null
          banner_monochrome?: boolean
          color_token?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_session_exercises: {
        Row: {
          created_at: string
          exercise_key: string | null
          exercise_name: string
          id: string
          muscle_group: string | null
          notes: string | null
          position: number
          rest_seconds: number
          session_id: string
          source_routine_exercise_id: string | null
          target_reps_max: number
          target_reps_min: number
          target_sets: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_key?: string | null
          exercise_name: string
          id?: string
          muscle_group?: string | null
          notes?: string | null
          position: number
          rest_seconds: number
          session_id: string
          source_routine_exercise_id?: string | null
          target_reps_max: number
          target_reps_min: number
          target_sets: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_key?: string | null
          exercise_name?: string
          id?: string
          muscle_group?: string | null
          notes?: string | null
          position?: number
          rest_seconds?: number
          session_id?: string
          source_routine_exercise_id?: string | null
          target_reps_max?: number
          target_reps_min?: number
          target_sets?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_exercises_session_owner_fk"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "workout_session_exercises_source_owner_fk"
            columns: ["source_routine_exercise_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_routine_exercises"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          activity_type: string
          best_estimated_1rm_kg: number | null
          completed_sets: number
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          personal_records: number
          routine_id: string | null
          routine_name: string
          started_at: string
          status: string
          total_volume_kg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          best_estimated_1rm_kg?: number | null
          completed_sets?: number
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          personal_records?: number
          routine_id?: string | null
          routine_name: string
          started_at?: string
          status?: string
          total_volume_kg?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          best_estimated_1rm_kg?: number | null
          completed_sets?: number
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          personal_records?: number
          routine_id?: string | null
          routine_name?: string
          started_at?: string
          status?: string
          total_volume_kg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_routine_owner_fk"
            columns: ["routine_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_routines"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          completed_at: string | null
          created_at: string
          estimated_1rm_kg: number | null
          id: string
          is_personal_record: boolean
          reps: number | null
          rir: number | null
          session_exercise_id: string
          session_id: string
          set_number: number
          updated_at: string
          user_id: string
          volume_kg: number | null
          weight_kg: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          estimated_1rm_kg?: number | null
          id?: string
          is_personal_record?: boolean
          reps?: number | null
          rir?: number | null
          session_exercise_id: string
          session_id: string
          set_number: number
          updated_at?: string
          user_id: string
          volume_kg?: number | null
          weight_kg?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          estimated_1rm_kg?: number | null
          id?: string
          is_personal_record?: boolean
          reps?: number | null
          rir?: number | null
          session_exercise_id?: string
          session_id?: string
          set_number?: number
          updated_at?: string
          user_id?: string
          volume_kg?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_session_owner_fk"
            columns: ["session_exercise_id", "session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_session_exercises"
            referencedColumns: ["id", "session_id", "user_id"]
          },
          {
            foreignKeyName: "workout_sets_session_owner_fk"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abandon_focus_run: { Args: { p_run_id: string }; Returns: undefined }
      complete_focus_run_and_award: { Args: { p_run_id: string }; Returns: Json }
      convert_task_to_calendar_event: {
        Args: { p_start_time: string; p_task_id: string }
        Returns: string
      }
      convert_reward_currency: {
        Args: { p_direction: string; p_request_key: string; p_units: number }
        Returns: Json
      }
      get_reward_dashboard: { Args: { p_history_limit?: number }; Returns: Json }
      redeem_reward_credit: {
        Args: { p_catalog_sku: string; p_request_key: string }
        Returns: Json
      }
      record_focus_session: {
        Args: {
          p_completed: boolean
          p_ended_at: string
          p_focus_run_id: string | null
          p_focused_seconds: number
          p_planned_seconds: number
          p_session_type: string
          p_started_at: string
          p_task_id: string | null
        }
        Returns: Database['public']['Tables']['focus_sessions']['Row']
      }
      schedule_focus_phase: {
        Args: {
          p_focus_run_id: string | null
          p_task_id: string | null
          p_started_at: string
          p_planned_seconds: number
          p_session_type: string
        }
        Returns: string
      }
      settle_focus_phase: {
        Args: { p_job_id: string }
        Returns: Database['public']['Tables']['focus_sessions']['Row']
      }
      pause_focus_phase: { Args: { p_job_id: string }; Returns: "running" | "paused" | "completed" | "cancelled" }
      resume_focus_phase: { Args: { p_job_id: string }; Returns: "running" | "paused" | "completed" | "cancelled" }
      cancel_focus_phase: { Args: { p_job_id: string }; Returns: "running" | "paused" | "completed" | "cancelled" }
      delete_focus_session: { Args: { p_session_id: string }; Returns: string }
      start_focus_run: { Args: { p_description?: string; p_mode: string }; Returns: string }
      finish_workout_session: {
        Args: { p_notes?: string; p_session_id: string }
        Returns: string
      }
      delete_workout_session: { Args: { p_session_id: string }; Returns: string }
      is_valid_weekdays: { Args: { value: number[] }; Returns: boolean }
      reorder_habits: {
        Args: { p_habit_ids: string[] }
        Returns: {
          archived_at: string | null
          color_token: string
          custom_color: string | null
          project_id: string | null
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          position: number
          schedule_type: string
          target_count: number
          title: string
          unit: string | null
          updated_at: string
          user_id: string
          weekdays: number[] | null
        }[]
        SetofOptions: {
          from: "*"
          to: "habits"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reorder_tasks: {
        Args: { p_task_ids: string[] }
        Returns: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          due_at: string | null
          estimate_minutes: number | null
          id: string
          notes: string | null
          position: number
          priority: string
          project_id: string | null
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      start_workout_session: { Args: { p_routine_id: string }; Returns: string }
      rename_active_workout_exercise: {
        Args: { p_exercise_name: string; p_session_exercise_id: string }
        Returns: Database['public']['Tables']['workout_session_exercises']['Row']
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
