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
      educator_access_requests: {
        Row: {
          affiliation: string
          author_id: string | null
          created_at: string
          decision_note: string | null
          expertise: string[]
          id: string
          requested_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          statement: string
          status: Database["public"]["Enums"]["educator_access_status"]
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          affiliation?: string
          author_id?: string | null
          created_at?: string
          decision_note?: string | null
          expertise?: string[]
          id?: string
          requested_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          statement?: string
          status?: Database["public"]["Enums"]["educator_access_status"]
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          affiliation?: string
          author_id?: string | null
          created_at?: string
          decision_note?: string | null
          expertise?: string[]
          id?: string
          requested_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          statement?: string
          status?: Database["public"]["Enums"]["educator_access_status"]
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "educator_access_requests_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "material_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      educator_accounts: {
        Row: {
          author_id: string
          linked_at: string
          linked_by: string
          user_id: string
        }
        Insert: {
          author_id: string
          linked_at?: string
          linked_by: string
          user_id: string
        }
        Update: {
          author_id?: string
          linked_at?: string
          linked_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "educator_accounts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: true
            referencedRelation: "material_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          created_at: string
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_authors: {
        Row: {
          affiliation: string
          biography: string
          created_at: string
          expertise: string[]
          id: string
          image_url: string | null
          name: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          affiliation?: string
          biography?: string
          created_at?: string
          expertise?: string[]
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          affiliation?: string
          biography?: string
          created_at?: string
          expertise?: string[]
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      material_edit_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          material_id: string
          message: string
          proposed_description: string | null
          proposed_title: string | null
          proposed_url: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["material_edit_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          material_id: string
          message: string
          proposed_description?: string | null
          proposed_title?: string | null
          proposed_url?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["material_edit_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          material_id?: string
          message?: string
          proposed_description?: string | null
          proposed_title?: string | null
          proposed_url?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["material_edit_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_edit_requests_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_feedback: {
        Row: {
          created_at: string
          id: string
          material_id: string
          message: string
          status: Database["public"]["Enums"]["feedback_status"]
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          message: string
          status?: Database["public"]["Enums"]["feedback_status"]
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          message?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          type?: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_feedback_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_views: {
        Row: {
          id: string
          material_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          material_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          material_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_views_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          approval_status: Database["public"]["Enums"]["material_approval_status"]
          author_id: string | null
          average_rating: number
          created_at: string
          description: string
          file_mime_type: string | null
          file_name: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          rating_count: number
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          subject_id: string
          submitted_at: string
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["material_type"]
          updated_at: string
          uploaded_by: string | null
          url: string
          view_count: number
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["material_approval_status"]
          author_id?: string | null
          average_rating?: number
          created_at?: string
          description: string
          file_mime_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          rating_count?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          subject_id: string
          submitted_at?: string
          tags?: string[]
          title: string
          type: Database["public"]["Enums"]["material_type"]
          updated_at?: string
          uploaded_by?: string | null
          url: string
          view_count?: number
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["material_approval_status"]
          author_id?: string | null
          average_rating?: number
          created_at?: string
          description?: string
          file_mime_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          rating_count?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          subject_id?: string
          submitted_at?: string
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["material_type"]
          updated_at?: string
          uploaded_by?: string | null
          url?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "material_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          preferences: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          preferences?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          material_id: string
          review: string | null
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          review?: string | null
          score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          review?: string | null
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          generated_at: string
          id: string
          material_id: string
          reason: string
          score: number
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          material_id: string
          reason: string
          score: number
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          material_id?: string
          reason?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          created_at: string
          id: string
          query: string
          result_count: number
          subject_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          result_count?: number
          subject_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          result_count?: number
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_members: {
        Row: {
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_note_completions: {
        Row: {
          completed_at: string
          note_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          note_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_note_completions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "study_group_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          group_id: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          group_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_notes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_resources: {
        Row: {
          group_id: string
          id: string
          material_id: string
          shared_at: string
          shared_by: string
        }
        Insert: {
          group_id: string
          id?: string
          material_id: string
          shared_at?: string
          shared_by: string
        }
        Update: {
          group_id?: string
          id?: string
          material_id?: string
          shared_at?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_resources_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_resources_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          name: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          name: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          name?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_groups_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_study_group_member_activity: {
        Args: { _group_id: string }
        Returns: {
          member_name: string
          notes_completed: number
          notes_shared: number
          resources_shared: number
          subject_ratings: number
          subject_views: number
          user_id: string
        }[]
      }
      get_study_group_progress: { Args: { _group_id: string }; Returns: Json }
      has_educator_author: {
        Args: { _author_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_study_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student" | "teacher"
      educator_access_status: "pending" | "approved" | "rejected" | "invited"
      feedback_status: "open" | "resolved"
      feedback_type: "question" | "comment"
      material_approval_status: "pending" | "approved" | "rejected"
      material_edit_status: "open" | "applied" | "declined"
      material_type: "PDF" | "Video" | "Article"
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
  public: {
    Enums: {
      app_role: ["admin", "student", "teacher"],
      educator_access_status: ["pending", "approved", "rejected", "invited"],
      feedback_status: ["open", "resolved"],
      feedback_type: ["question", "comment"],
      material_approval_status: ["pending", "approved", "rejected"],
      material_edit_status: ["open", "applied", "declined"],
      material_type: ["PDF", "Video", "Article"],
    },
  },
} as const
