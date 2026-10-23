export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          post_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          post_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          last_read_at: string | null;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          last_read_at?: string | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          last_read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          dm_key: string;
          id: string;
          last_message_at: string | null;
          last_message_preview: string | null;
          last_message_sender_id: string | null;
        };
        Insert: {
          created_at?: string;
          dm_key: string;
          id?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          last_message_sender_id?: string | null;
        };
        Update: {
          created_at?: string;
          dm_key?: string;
          id?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          last_message_sender_id?: string | null;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender_id: string | null;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      post_likes: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          alt_text: string;
          author_id: string;
          caption: string;
          comments_count: number;
          created_at: string;
          id: string;
          image_height: number;
          image_path: string;
          image_width: number;
          likes_count: number;
          location: string;
          thumbhash: string | null;
          updated_at: string;
        };
        Insert: {
          alt_text?: string;
          author_id: string;
          caption?: string;
          comments_count?: number;
          created_at?: string;
          id?: string;
          image_height: number;
          image_path: string;
          image_width: number;
          likes_count?: number;
          location?: string;
          thumbhash?: string | null;
          updated_at?: string;
        };
        Update: {
          alt_text?: string;
          author_id?: string;
          caption?: string;
          comments_count?: number;
          created_at?: string;
          id?: string;
          image_height?: number;
          image_path?: string;
          image_width?: number;
          likes_count?: number;
          location?: string;
          thumbhash?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          bio: string;
          created_at: string;
          followers_count: number;
          following_count: number;
          full_name: string;
          id: string;
          posts_count: number;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_path?: string | null;
          bio?: string;
          created_at?: string;
          followers_count?: number;
          following_count?: number;
          full_name: string;
          id: string;
          posts_count?: number;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_path?: string | null;
          bio?: string;
          created_at?: string;
          followers_count?: number;
          following_count?: number;
          full_name?: string;
          id?: string;
          posts_count?: number;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      saved_posts: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_explore_posts: {
        Args: { cursor_created_at?: string; cursor_id?: string; max_results?: number };
        Returns: {
          alt_text: string;
          author_username: string;
          comments_count: number;
          created_at: string;
          id: string;
          image_height: number;
          image_path: string;
          image_width: number;
          likes_count: number;
          thumbhash: string;
        }[];
      };
      get_feed: {
        Args: { cursor_created_at?: string; cursor_id?: string; max_results?: number };
        Returns: {
          alt_text: string;
          author_avatar_path: string;
          author_full_name: string;
          author_id: string;
          author_username: string;
          caption: string;
          comments_count: number;
          created_at: string;
          id: string;
          image_height: number;
          image_path: string;
          image_width: number;
          latest_comments: Json;
          liked_by_viewer: boolean;
          likes_count: number;
          location: string;
          saved_by_viewer: boolean;
          thumbhash: string;
        }[];
      };
      get_follow_list: {
        Args: {
          cursor_followed_at?: string;
          cursor_id?: string;
          list_kind: string;
          max_results?: number;
          profile_id: string;
        };
        Returns: {
          avatar_path: string;
          followed_at: string;
          follows_viewer: boolean;
          full_name: string;
          id: string;
          username: string;
          viewer_follows: boolean;
        }[];
      };
      get_follow_status: {
        Args: { target_id: string };
        Returns: {
          is_followed_by: boolean;
          is_following: boolean;
        }[];
      };
      get_follow_suggestions: {
        Args: { max_results?: number };
        Returns: {
          avatar_path: string;
          followers_count: number;
          follows_viewer: boolean;
          full_name: string;
          id: string;
          mutual_count: number;
          username: string;
        }[];
      };
      get_inbox: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          last_message_at: string;
          last_message_preview: string;
          last_message_sender_id: string;
          other_avatar_path: string;
          other_full_name: string;
          other_id: string;
          other_last_read_at: string;
          other_username: string;
          unread: boolean;
        }[];
      };
      get_like_status: {
        Args: { post_id: string };
        Returns: {
          liked: boolean;
          likes_count: number;
        }[];
      };
      get_or_create_dm: { Args: { other_user_id: string }; Returns: string };
      get_post_comments: {
        Args: {
          cursor_created_at?: string;
          cursor_id?: string;
          max_results?: number;
          post_id: string;
        };
        Returns: {
          author_avatar_path: string;
          author_full_name: string;
          author_id: string;
          author_username: string;
          body: string;
          can_delete: boolean;
          created_at: string;
          id: string;
        }[];
      };
      get_post_likers: {
        Args: {
          cursor_id?: string;
          cursor_liked_at?: string;
          max_results?: number;
          post_id: string;
        };
        Returns: {
          avatar_path: string;
          follows_viewer: boolean;
          full_name: string;
          id: string;
          liked_at: string;
          username: string;
          viewer_follows: boolean;
        }[];
      };
      get_profile_posts: {
        Args: {
          cursor_created_at?: string;
          cursor_id?: string;
          max_results?: number;
          profile_id: string;
        };
        Returns: {
          alt_text: string;
          created_at: string;
          id: string;
          image_height: number;
          image_path: string;
          image_width: number;
          thumbhash: string;
        }[];
      };
      get_saved_posts: {
        Args: { cursor_id?: string; cursor_saved_at?: string; max_results?: number };
        Returns: {
          alt_text: string;
          author_username: string;
          created_at: string;
          id: string;
          image_height: number;
          image_path: string;
          image_width: number;
          saved_at: string;
          thumbhash: string;
        }[];
      };
      get_unread_count: { Args: Record<PropertyKey, never>; Returns: number };
      is_username_available: { Args: { username: string }; Returns: boolean };
      mark_conversation_read: { Args: { conversation_id: string }; Returns: undefined };
      search_profiles: {
        Args: { max_results?: number; query: string };
        Returns: {
          avatar_path: string;
          followers_count: number;
          follows_viewer: boolean;
          full_name: string;
          id: string;
          username: string;
          viewer_follows: boolean;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
