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
      admin_profiles: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          created_at?: string
        }
        Update: {
          email?: string
          created_at?: string
        }
      }
      webinars: {
        Row: {
          id: string
          title: string
          description: string | null
          slug: string
          speaker: string | null
          video_type: 'mp4' | 'youtube' | 'vimeo'
          video_url: string | null
          thumbnail: string | null
          duration_seconds: number
          status: 'draft' | 'published' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          slug: string
          speaker?: string | null
          video_type: 'mp4' | 'youtube' | 'vimeo'
          video_url?: string | null
          thumbnail?: string | null
          duration_seconds: number
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          slug?: string
          speaker?: string | null
          video_type?: 'mp4' | 'youtube' | 'vimeo'
          video_url?: string | null
          thumbnail?: string | null
          duration_seconds?: number
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
          updated_at?: string
        }
      }
      scheduled_sessions: {
        Row: {
          id: string
          webinar_id: string
          start_time: string
          end_time: string
          status: 'scheduled' | 'live' | 'ended' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          webinar_id: string
          start_time: string
          end_time: string
          status?: 'scheduled' | 'live' | 'ended' | 'cancelled'
          created_at?: string
        }
        Update: {
          webinar_id?: string
          start_time?: string
          end_time?: string
          status?: 'scheduled' | 'live' | 'ended' | 'cancelled'
          created_at?: string
        }
      }
      recurrence_rules: {
        Row: {
          id: string
          webinar_id: string
          days_of_week: number[]
          time_of_day: string
          timezone: string
          end_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          webinar_id: string
          days_of_week: number[]
          time_of_day: string
          timezone?: string
          end_date?: string | null
          created_at?: string
        }
        Update: {
          webinar_id?: string
          days_of_week?: number[]
          time_of_day?: string
          timezone?: string
          end_date?: string | null
          created_at?: string
        }
      }
      registrations: {
        Row: {
          id: string
          session_id: string
          webinar_id: string
          name: string
          email: string
          join_token: string
          joined_at: string | null
          purchase_status: 'none' | 'clicked' | 'purchased'
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          webinar_id: string
          name: string
          email: string
          join_token?: string
          joined_at?: string | null
          purchase_status?: 'none' | 'clicked' | 'purchased'
          created_at?: string
        }
        Update: {
          session_id?: string
          webinar_id?: string
          name?: string
          email?: string
          join_token?: string
          joined_at?: string | null
          purchase_status?: 'none' | 'clicked' | 'purchased'
          created_at?: string
        }
      }
      offers: {
        Row: {
          id: string
          webinar_id: string
          offer_time_seconds: number
          title: string
          button_text: string
          payment_link: string
          popup_title: string | null
          popup_description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          webinar_id: string
          offer_time_seconds: number
          title: string
          button_text: string
          payment_link: string
          popup_title?: string | null
          popup_description?: string | null
          created_at?: string
        }
        Update: {
          webinar_id?: string
          offer_time_seconds?: number
          title?: string
          button_text?: string
          payment_link?: string
          popup_title?: string | null
          popup_description?: string | null
          created_at?: string
        }
      }
      ai_instructions: {
        Row: {
          id: string
          webinar_id: string
          system_prompt: string
          personality: string | null
          rules: string | null
          sales_copy: string | null
          created_at: string
        }
        Insert: {
          id?: string
          webinar_id: string
          system_prompt: string
          personality?: string | null
          rules?: string | null
          sales_copy?: string | null
          created_at?: string
        }
        Update: {
          webinar_id?: string
          system_prompt?: string
          personality?: string | null
          rules?: string | null
          sales_copy?: string | null
          created_at?: string
        }
      }
      ai_knowledge: {
        Row: {
          id: string
          webinar_id: string
          source_type: 'faq' | 'pdf' | 'notes' | 'sales_page' | 'transcript'
          title: string | null
          content: string
          embedding: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          webinar_id: string
          source_type: 'faq' | 'pdf' | 'notes' | 'sales_page' | 'transcript'
          title?: string | null
          content: string
          embedding?: number[] | null
          created_at?: string
        }
        Update: {
          webinar_id?: string
          source_type?: 'faq' | 'pdf' | 'notes' | 'sales_page' | 'transcript'
          title?: string | null
          content?: string
          embedding?: number[] | null
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          registration_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          registration_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: {
          registration_id?: string
          role?: 'user' | 'assistant'
          content?: string
          created_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          webinar_id: string
          session_id: string | null
          registration_id: string | null
          event_type: 'register' | 'join' | 'offer_click' | 'purchase' | 'complete'
          occurred_at: string
        }
        Insert: {
          id?: string
          webinar_id: string
          session_id?: string | null
          registration_id?: string | null
          event_type: 'register' | 'join' | 'offer_click' | 'purchase' | 'complete'
          occurred_at?: string
        }
        Update: {
          webinar_id?: string
          session_id?: string | null
          registration_id?: string | null
          event_type?: 'register' | 'join' | 'offer_click' | 'purchase' | 'complete'
          occurred_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      match_ai_knowledge: {
        Args: {
          p_webinar_id: string
          p_embedding: number[]
          p_top_k?: number
        }
        Returns: {
          id: string
          content: string
          title: string | null
          source_type: string
          similarity: number
        }[]
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

export type Webinar = Database['public']['Tables']['webinars']['Row']
export type ScheduledSession = Database['public']['Tables']['scheduled_sessions']['Row']
export type RecurrenceRule = Database['public']['Tables']['recurrence_rules']['Row']
export type Registration = Database['public']['Tables']['registrations']['Row']
export type Offer = Database['public']['Tables']['offers']['Row']
export type AiInstructions = Database['public']['Tables']['ai_instructions']['Row']
export type AiKnowledge = Database['public']['Tables']['ai_knowledge']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row']
