export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          timezone: string
          week_starts_on: number
          theme: 'light' | 'dark' | 'system'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          timezone: string
          week_starts_on?: number
          theme?: 'light' | 'dark' | 'system'
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          avatar_url?: string | null
          timezone?: string
          week_starts_on?: number
          theme?: 'light' | 'dark' | 'system'
          updated_at?: string
        }
        Relationships: []
      }
      task_projects: {
        Row: {
          id: string
          user_id: string
          name: string
          color_token: 'mint' | 'coral' | 'blue' | 'sand' | 'slate'
          icon: string | null
          position: number
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color_token?: 'mint' | 'coral' | 'blue' | 'sand' | 'slate'
          icon?: string | null
          position?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          color_token?: 'mint' | 'coral' | 'blue' | 'sand' | 'slate'
          icon?: string | null
          position?: number
          archived_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          title: string
          notes: string | null
          status: 'open' | 'completed' | 'archived'
          priority: 'none' | 'low' | 'medium' | 'high'
          scheduled_date: string | null
          due_at: string | null
          estimate_minutes: number | null
          position: number
          completed_at: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          title: string
          notes?: string | null
          status?: 'open' | 'completed' | 'archived'
          priority?: 'none' | 'low' | 'medium' | 'high'
          scheduled_date?: string | null
          due_at?: string | null
          estimate_minutes?: number | null
          position?: number
          completed_at?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          project_id?: string | null
          title?: string
          notes?: string | null
          status?: 'open' | 'completed' | 'archived'
          priority?: 'none' | 'low' | 'medium' | 'high'
          scheduled_date?: string | null
          due_at?: string | null
          estimate_minutes?: number | null
          position?: number
          completed_at?: string | null
          archived_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_checklist_items: {
        Row: {
          id: string
          user_id: string
          task_id: string
          title: string
          completed: boolean
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          title: string
          completed?: boolean
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          completed?: boolean
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          all_day: boolean
          start_at: string | null
          end_at: string | null
          start_date: string | null
          end_date: string | null
          category: string | null
          color_token: 'mint' | 'coral' | 'blue' | 'sand' | 'slate'
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          all_day?: boolean
          start_at?: string | null
          end_at?: string | null
          start_date?: string | null
          end_date?: string | null
          category?: string | null
          color_token?: 'mint' | 'coral' | 'blue' | 'sand' | 'slate'
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          all_day?: boolean
          start_at?: string | null
          end_at?: string | null
          start_date?: string | null
          end_date?: string | null
          category?: string | null
          color_token?: 'mint' | 'coral' | 'blue' | 'sand' | 'slate'
          location?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          id: string
          user_id: string
          task_id: string | null
          started_at: string
          ended_at: string
          planned_seconds: number
          focused_seconds: number
          session_type: 'focus' | 'short_break' | 'long_break'
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id?: string | null
          started_at: string
          ended_at: string
          planned_seconds: number
          focused_seconds: number
          session_type: 'focus' | 'short_break' | 'long_break'
          completed?: boolean
          created_at?: string
        }
        Update: {
          task_id?: string | null
          started_at?: string
          ended_at?: string
          planned_seconds?: number
          focused_seconds?: number
          session_type?: 'focus' | 'short_break' | 'long_break'
          completed?: boolean
        }
        Relationships: []
      }
      habits: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          icon: 'circle-check-big' | 'glass-water' | 'book-open' | 'dumbbell' | 'footprints' | 'brain'
          color_token: 'mint' | 'coral' | 'blue' | 'sand' | 'slate'
          schedule_type: 'daily' | 'weekdays'
          weekdays: number[] | null
          target_count: number
          unit: string | null
          position: number
          is_active: boolean
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          icon?: 'circle-check-big' | 'glass-water' | 'book-open' | 'dumbbell' | 'footprints' | 'brain'
          color_token?: 'mint' | 'coral' | 'blue' | 'sand' | 'slate'
          schedule_type?: 'daily' | 'weekdays'
          weekdays?: number[] | null
          target_count?: number
          unit?: string | null
          position?: number
          is_active?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          icon?: 'circle-check-big' | 'glass-water' | 'book-open' | 'dumbbell' | 'footprints' | 'brain'
          color_token?: 'mint' | 'coral' | 'blue' | 'sand' | 'slate'
          schedule_type?: 'daily' | 'weekdays'
          weekdays?: number[] | null
          target_count?: number
          unit?: string | null
          position?: number
          is_active?: boolean
          archived_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          id: string
          user_id: string
          habit_id: string
          local_date: string
          count: number
          status: 'in_progress' | 'completed' | 'skipped'
          note: string | null
          source: 'manual' | 'workout' | null
          source_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          habit_id: string
          local_date: string
          count?: number
          status?: 'in_progress' | 'completed' | 'skipped'
          note?: string | null
          source?: 'manual' | 'workout' | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          count?: number
          status?: 'in_progress' | 'completed' | 'skipped'
          note?: string | null
          source?: 'manual' | 'workout' | null
          source_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      reorder_habits: {
        Args: { p_habit_ids: string[] }
        Returns: Database['public']['Tables']['habits']['Row'][]
      }
      reorder_tasks: {
        Args: { p_task_ids: string[] }
        Returns: Database['public']['Tables']['tasks']['Row'][]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
