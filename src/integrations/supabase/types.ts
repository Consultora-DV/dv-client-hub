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
  public: {
    Tables: {
      calendar_events: {
        Row: {
          cliente_id: string
          content_type: string | null
          created_at: string
          date: string
          id: string
          ig_short_code: string | null
          platform: string[]
          time: string | null
          title: string
          updated_at: string
          video_id: string | null
        }
        Insert: {
          cliente_id: string
          content_type?: string | null
          created_at?: string
          date: string
          id?: string
          ig_short_code?: string | null
          platform?: string[]
          time?: string | null
          title: string
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          cliente_id?: string
          content_type?: string | null
          created_at?: string
          date?: string
          id?: string
          ig_short_code?: string | null
          platform?: string[]
          time?: string | null
          title?: string
          updated_at?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          blueprint_file: string | null
          blueprint_name: string | null
          business_name: string | null
          city: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          industry: string | null
          photo_url: string | null
          social_networks: Json | null
          strategy: Json | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          blueprint_file?: string | null
          blueprint_name?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          industry?: string | null
          photo_url?: string | null
          social_networks?: Json | null
          strategy?: Json | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          blueprint_file?: string | null
          blueprint_name?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          industry?: string | null
          photo_url?: string | null
          social_networks?: Json | null
          strategy?: Json | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          cliente_id: string
          created_at: string
          date: string
          drive_link: string
          file_url: string | null
          id: string
          is_new: boolean
          name: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          date?: string
          drive_link?: string
          file_url?: string | null
          id?: string
          is_new?: boolean
          name: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          date?: string
          drive_link?: string
          file_url?: string | null
          id?: string
          is_new?: boolean
          name?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          date: string
          id: string
          link: string
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          link?: string
          message: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          link?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_metrics: {
        Row: {
          cliente_id: string
          comments: number | null
          created_at: string
          date: string | null
          engagement: number | null
          id: string
          ig_short_code: string | null
          likes: number | null
          platform: string
          post_url: string | null
          reach: number | null
          shares: number | null
          thumbnail: string | null
          title: string | null
          type: string | null
          views: number | null
        }
        Insert: {
          cliente_id: string
          comments?: number | null
          created_at?: string
          date?: string | null
          engagement?: number | null
          id?: string
          ig_short_code?: string | null
          likes?: number | null
          platform?: string
          post_url?: string | null
          reach?: number | null
          shares?: number | null
          thumbnail?: string | null
          title?: string | null
          type?: string | null
          views?: number | null
        }
        Update: {
          cliente_id?: string
          comments?: number | null
          created_at?: string
          date?: string | null
          engagement?: number | null
          id?: string
          ig_short_code?: string | null
          likes?: number | null
          platform?: string
          post_url?: string | null
          reach?: number | null
          shares?: number | null
          thumbnail?: string | null
          title?: string | null
          type?: string | null
          views?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          avatar_url: string | null
          business: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          business?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          business?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      script_comments: {
        Row: {
          author: string
          created_at: string
          date: string
          id: string
          is_client: boolean
          script_id: string
          text: string
          user_id: string
        }
        Insert: {
          author: string
          created_at?: string
          date?: string
          id?: string
          is_client?: boolean
          script_id: string
          text: string
          user_id: string
        }
        Update: {
          author?: string
          created_at?: string
          date?: string
          id?: string
          is_client?: boolean
          script_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_comments_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          cliente_id: string
          created_at: string
          date: string
          drive_link: string
          id: string
          is_new: boolean
          sort_order: number
          status: string
          status_history: Json
          title: string
          updated_at: string
          visto: boolean
        }
        Insert: {
          cliente_id: string
          created_at?: string
          date?: string
          drive_link?: string
          id?: string
          is_new?: boolean
          sort_order?: number
          status?: string
          status_history?: Json
          title: string
          updated_at?: string
          visto?: boolean
        }
        Update: {
          cliente_id?: string
          created_at?: string
          date?: string
          drive_link?: string
          id?: string
          is_new?: boolean
          sort_order?: number
          status?: string
          status_history?: Json
          title?: string
          updated_at?: string
          visto?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          author: string
          created_at: string
          date: string
          id: string
          is_client: boolean
          text: string
          user_id: string
          video_id: string
        }
        Insert: {
          author: string
          created_at?: string
          date?: string
          id?: string
          is_client?: boolean
          text: string
          user_id: string
          video_id: string
        }
        Update: {
          author?: string
          created_at?: string
          date?: string
          id?: string
          is_client?: boolean
          text?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          cliente_id: string
          created_at: string
          delivery_date: string | null
          drive_link: string | null
          embed_url: string | null
          id: string
          ig_caption: string | null
          ig_comments: number | null
          ig_hashtags: string[] | null
          ig_likes: number | null
          ig_short_code: string | null
          ig_views: number | null
          platform: string[]
          status: string
          status_history: Json
          thumbnail: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          delivery_date?: string | null
          drive_link?: string | null
          embed_url?: string | null
          id?: string
          ig_caption?: string | null
          ig_comments?: number | null
          ig_hashtags?: string[] | null
          ig_likes?: number | null
          ig_short_code?: string | null
          ig_views?: number | null
          platform?: string[]
          status?: string
          status_history?: Json
          thumbnail?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          delivery_date?: string | null
          drive_link?: string | null
          embed_url?: string | null
          id?: string
          ig_caption?: string | null
          ig_comments?: number | null
          ig_hashtags?: string[] | null
          ig_likes?: number | null
          ig_short_code?: string | null
          ig_views?: number | null
          platform?: string[]
          status?: string
          status_history?: Json
          thumbnail?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "diseñador" | "cliente"
      approval_status: "pending" | "approved" | "rejected"
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
    Enums: {
      app_role: ["admin", "editor", "diseñador", "cliente"],
      approval_status: ["pending", "approved", "rejected"],
    },
  },
} as const
