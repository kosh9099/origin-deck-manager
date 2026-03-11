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
      trade_boosts: {
        Row: {
          id: string
          zone: string
          city: string | null
          type: string
          start_time: string
          created_at: string
        }
        Insert: {
          id?: string
          zone: string
          city?: string | null
          type: string
          start_time: string
          created_at?: string
        }
        Update: {
          id?: string
          zone?: string
          city?: string | null
          type?: string
          start_time?: string
          created_at?: string
        }
      }
      trade_items: {
        Row: {
          id: string
          schedule_id: string
          item_name: string
          upvotes: number
          downvotes: number
          created_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          item_name: string
          upvotes?: number
          downvotes?: number
          created_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          item_name?: string
          upvotes?: number
          downvotes?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
