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
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          price: number
          sale_price: number | null
          stock: number
          category_id: string
          images: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          price: number
          sale_price?: number | null
          stock?: number
          category_id: string
          images?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          price?: number
          sale_price?: number | null
          stock?: number
          category_id?: string
          images?: Json
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_name: string
          email: string
          phone: string
          address: string
          status: Database['public']['Enums']['order_status']
          total: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_name: string
          email: string
          phone: string
          address: string
          status?: Database['public']['Enums']['order_status']
          total: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_name?: string
          email?: string
          phone?: string
          address?: string
          status?: Database['public']['Enums']['order_status']
          total?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          quantity: number
          price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          price?: number
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          product_id: string
          customer_name: string
          rating: number
          comment: string | null
          is_approved: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          customer_name: string
          rating: number
          comment?: string | null
          is_approved?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          customer_name?: string
          rating?: number
          comment?: string | null
          is_approved?: boolean | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          type: string
          title: string
          content: string
          recipient_email: string
          is_read: boolean
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          title: string
          content: string
          recipient_email: string
          is_read?: boolean
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          title?: string
          content?: string
          recipient_email?: string
          is_read?: boolean
          metadata?: Json
          created_at?: string
        }
      }
    }
    Enums: {
      order_status: 'pending' | 'confirmed' | 'shipped' | 'delivered'
    }
    Functions: {
      get_sales_stats: {
        Args: Record<string, never>
        Returns: Json
      }
    }
  }
}