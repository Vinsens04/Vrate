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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      episode_progress: {
        Row: {
          created_at: string
          duration_seconds: number | null
          episode_number: number
          id: string
          is_completed: boolean
          last_source_name: string | null
          last_source_url: string | null
          last_watched_at: string | null
          library_entry_id: string
          progress_percent: number
          progress_seconds: number
          season_number: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          episode_number?: number
          id?: string
          is_completed?: boolean
          last_source_name?: string | null
          last_source_url?: string | null
          last_watched_at?: string | null
          library_entry_id: string
          progress_percent?: number
          progress_seconds?: number
          season_number?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          episode_number?: number
          id?: string
          is_completed?: boolean
          last_source_name?: string | null
          last_source_url?: string | null
          last_watched_at?: string | null
          library_entry_id?: string
          progress_percent?: number
          progress_seconds?: number
          season_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_progress_library_entry_id_fkey"
            columns: ["library_entry_id"]
            isOneToOne: false
            referencedRelation: "library_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      library_entries: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_favorite: boolean
          last_watched_at: string | null
          media_id: string
          notes: string | null
          rating: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["library_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          last_watched_at?: string | null
          media_id: string
          notes?: string | null
          rating?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["library_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          last_watched_at?: string | null
          media_id?: string
          notes?: string | null
          rating?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["library_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_entries_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          backdrop_url: string | null
          created_at: string
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          metadata: Json
          original_title: string | null
          overview: string | null
          poster_url: string | null
          release_date: string | null
          release_year: number | null
          runtime_minutes: number | null
          title: string
          total_episodes: number | null
          total_seasons: number | null
          updated_at: string
        }
        Insert: {
          backdrop_url?: string | null
          created_at?: string
          id?: string
          media_type: Database["public"]["Enums"]["media_type"]
          metadata?: Json
          original_title?: string | null
          overview?: string | null
          poster_url?: string | null
          release_date?: string | null
          release_year?: number | null
          runtime_minutes?: number | null
          title: string
          total_episodes?: number | null
          total_seasons?: number | null
          updated_at?: string
        }
        Update: {
          backdrop_url?: string | null
          created_at?: string
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          metadata?: Json
          original_title?: string | null
          overview?: string | null
          poster_url?: string | null
          release_date?: string | null
          release_year?: number | null
          runtime_minutes?: number | null
          title?: string
          total_episodes?: number | null
          total_seasons?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      media_external_ids: {
        Row: {
          created_at: string
          external_id: string
          id: string
          media_id: string
          provider: Database["public"]["Enums"]["metadata_provider"]
        }
        Insert: {
          created_at?: string
          external_id: string
          id?: string
          media_id: string
          provider: Database["public"]["Enums"]["metadata_provider"]
        }
        Update: {
          created_at?: string
          external_id?: string
          id?: string
          media_id?: string
          provider?: Database["public"]["Enums"]["metadata_provider"]
        }
        Relationships: [
          {
            foreignKeyName: "media_external_ids_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_preferences: {
        Row: {
          auto_add: boolean
          confirm_before_tracking: boolean
          created_at: string
          domain: string
          id: string
          tracking_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_add?: boolean
          confirm_before_tracking?: boolean
          created_at?: string
          domain: string
          id?: string
          tracking_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_add?: boolean
          confirm_before_tracking?: boolean
          created_at?: string
          domain?: string
          id?: string
          tracking_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          auto_add_after_seconds: number
          auto_complete_threshold: number
          auto_detect: boolean
          auto_track_progress: boolean
          confirm_before_tracking: boolean
          created_at: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_add_after_seconds?: number
          auto_complete_threshold?: number
          auto_detect?: boolean
          auto_track_progress?: boolean
          confirm_before_tracking?: boolean
          created_at?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_add_after_seconds?: number
          auto_complete_threshold?: number
          auto_detect?: boolean
          auto_track_progress?: boolean
          confirm_before_tracking?: boolean
          created_at?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watch_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          episode_progress_id: string | null
          id: string
          library_entry_id: string
          source_domain: string | null
          source_name: string
          source_url: string | null
          started_at: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          episode_progress_id?: string | null
          id?: string
          library_entry_id: string
          source_domain?: string | null
          source_name: string
          source_url?: string | null
          started_at?: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          episode_progress_id?: string | null
          id?: string
          library_entry_id?: string
          source_domain?: string | null
          source_name?: string
          source_url?: string | null
          started_at?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "watch_sessions_episode_progress_id_fkey"
            columns: ["episode_progress_id"]
            isOneToOne: false
            referencedRelation: "episode_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_sessions_library_entry_id_fkey"
            columns: ["library_entry_id"]
            isOneToOne: false
            referencedRelation: "library_entries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      library_status:
        | "watchlist"
        | "watching"
        | "completed"
        | "paused"
        | "dropped"
      media_type: "movie" | "series"
      metadata_provider: "tmdb" | "anilist"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      library_status: [
        "watchlist",
        "watching",
        "completed",
        "paused",
        "dropped",
      ],
      media_type: ["movie", "series"],
      metadata_provider: ["tmdb", "anilist"],
    },
  },
} as const
