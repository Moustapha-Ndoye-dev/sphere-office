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
        Relationships: [
          {
            foreignKeyName: 'categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          price: number
          sale_price: number | null
          sku: string | null
          status: Database['public']['Enums']['product_status']
          is_featured: boolean
          availability: Database['public']['Enums']['product_availability']
          low_stock_threshold: number
          purchase_price: number
          weight: number | null
          volume: number | null
          stock: number
          category_id: string
          images: string[]
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
          sku?: string | null
          status?: Database['public']['Enums']['product_status']
          is_featured?: boolean
          availability?: Database['public']['Enums']['product_availability']
          low_stock_threshold?: number
          purchase_price?: number
          weight?: number | null
          volume?: number | null
          stock?: number
          category_id: string
          images?: string[]
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
          sku?: string | null
          status?: Database['public']['Enums']['product_status']
          is_featured?: boolean
          availability?: Database['public']['Enums']['product_availability']
          low_stock_threshold?: number
          purchase_price?: number
          weight?: number | null
          volume?: number | null
          stock?: number
          category_id?: string
          images?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          id: string
          customer_name: string
          email: string
          phone: string
          address: string
          status: Database['public']['Enums']['order_status']
          payment_status: Database['public']['Enums']['payment_status']
          total: number
          subtotal: number
          discount_total: number
          delivery_fee: number
          total_ht: number
          tax_total: number
          total_ttc: number
          amount_paid: number
          balance_due: number
          payment_method: string | null
          paid_at: string | null
          payment_note: string | null
          notes: string | null
          estimated_delivery_at: string | null
          last_status_changed_at: string
          tracking_token: string
          idempotency_key: string | null
          idempotency_fingerprint: string | null
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
          payment_status?: Database['public']['Enums']['payment_status']
          total: number
          subtotal?: number
          discount_total?: number
          delivery_fee?: number
          total_ht?: number
          tax_total?: number
          total_ttc?: number
          amount_paid?: number
          balance_due?: number
          payment_method?: string | null
          paid_at?: string | null
          payment_note?: string | null
          notes?: string | null
          estimated_delivery_at?: string | null
          last_status_changed_at?: string
          tracking_token?: string
          idempotency_key?: string | null
          idempotency_fingerprint?: string | null
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
          payment_status?: Database['public']['Enums']['payment_status']
          total?: number
          subtotal?: number
          discount_total?: number
          delivery_fee?: number
          total_ht?: number
          tax_total?: number
          total_ttc?: number
          amount_paid?: number
          balance_due?: number
          payment_method?: string | null
          paid_at?: string | null
          payment_note?: string | null
          notes?: string | null
          estimated_delivery_at?: string | null
          last_status_changed_at?: string
          tracking_token?: string
          idempotency_key?: string | null
          idempotency_fingerprint?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          item_name: string | null
          item_reference: string | null
          quantity: number
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          item_name?: string | null
          item_reference?: string | null
          quantity: number
          price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          item_name?: string | null
          item_reference?: string | null
          quantity?: number
          price?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          old_status: Database['public']['Enums']['order_status'] | null
          new_status: Database['public']['Enums']['order_status']
          actor_id: string | null
          actor_name: string | null
          note: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          order_id: string
          old_status?: Database['public']['Enums']['order_status'] | null
          new_status: Database['public']['Enums']['order_status']
          actor_id?: string | null
          actor_name?: string | null
          note?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          old_status?: Database['public']['Enums']['order_status'] | null
          new_status?: Database['public']['Enums']['order_status']
          actor_id?: string | null
          actor_name?: string | null
          note?: string | null
          changed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'order_status_history_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      product_requests: {
        Row: {
          id: string
          product_id: string
          product_name: string
          product_reference: string | null
          quantity: number
          customer_name: string
          phone: string
          address: string
          notes: string | null
          status: Database['public']['Enums']['product_request_status']
          idempotency_key: string
          idempotency_fingerprint: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          product_name: string
          product_reference?: string | null
          quantity: number
          customer_name: string
          phone: string
          address: string
          notes?: string | null
          status?: Database['public']['Enums']['product_request_status']
          idempotency_key: string
          idempotency_fingerprint: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          product_name?: string
          product_reference?: string | null
          quantity?: number
          customer_name?: string
          phone?: string
          address?: string
          notes?: string | null
          status?: Database['public']['Enums']['product_request_status']
          idempotency_key?: string
          idempotency_fingerprint?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_requests_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'reviews_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: []
      }
      profiles: {
        Row: {
          id_profiles: string
          user_id: string | null
          login: string
          mdp: string
          role: 'superadmin' | 'admin' | 'cashier'
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id_profiles?: string
          user_id?: string | null
          login: string
          mdp: string
          role: 'superadmin' | 'admin' | 'cashier'
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id_profiles?: string
          user_id?: string | null
          login?: string
          mdp?: string
          role?: 'superadmin' | 'admin' | 'cashier'
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          logo: string | null
          favicon: string | null
          hero_image: string | null
          about_image: string | null
          contact_image: string | null
          background_color: string | null
          location_title: string | null
          location_address: string | null
          location_map_url: string | null
          location_link: string | null
          location_phone: string | null
          location_email: string | null
          facebook_url: string | null
          instagram_url: string | null
          linkedin_url: string | null
          tiktok_url: string | null
          whatsapp_number: string | null
          tab_title: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          logo?: string | null
          favicon?: string | null
          hero_image?: string | null
          about_image?: string | null
          contact_image?: string | null
          background_color?: string | null
          location_title?: string | null
          location_address?: string | null
          location_map_url?: string | null
          location_link?: string | null
          location_phone?: string | null
          location_email?: string | null
          facebook_url?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          tiktok_url?: string | null
          whatsapp_number?: string | null
          tab_title?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          logo?: string | null
          favicon?: string | null
          hero_image?: string | null
          about_image?: string | null
          contact_image?: string | null
          background_color?: string | null
          location_title?: string | null
          location_address?: string | null
          location_map_url?: string | null
          location_link?: string | null
          location_phone?: string | null
          location_email?: string | null
          facebook_url?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          tiktok_url?: string | null
          whatsapp_number?: string | null
          tab_title?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          id: string
          name: string
          description: string | null
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          start_date: string
          end_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          start_date: string
          end_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          discount_type?: 'percentage' | 'fixed'
          discount_value?: number
          start_date?: string
          end_date?: string | null
          created_at?: string
        }
        Relationships: []
      }
      promotion_products: {
        Row: {
          promotion_id: string
          product_id: string
        }
        Insert: {
          promotion_id: string
          product_id: string
        }
        Update: {
          promotion_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'promotion_products_promotion_id_fkey'
            columns: ['promotion_id']
            isOneToOne: false
            referencedRelation: 'promotions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'promotion_products_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      public_products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          price: number
          sale_price: number | null
          sku: string | null
          is_featured: boolean
          category_id: string
          images: string[]
          created_at: string
          updated_at: string
          is_in_stock: boolean
          availability: Database['public']['Enums']['product_availability']
          category_name: string
          category_slug: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Enums: {
      order_status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
      payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded'
      product_status: 'active' | 'draft' | 'archived'
      product_availability: 'available' | 'unavailable' | 'on_order'
      product_request_status: 'pending' | 'contacted' | 'quoted' | 'confirmed' | 'cancelled' | 'completed'
    }
    Functions: {
      create_product_request_secure: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_customer_name: string
          p_phone: string
          p_address: string
          p_notes: string | null
          p_idempotency_key: string
        }
        Returns: Database['public']['Tables']['product_requests']['Row']
      }
      create_order_secure: {
        Args: {
          p_customer_name: string
          p_email: string
          p_phone: string
          p_address: string
          p_notes: string | null
          p_items: Json
          p_idempotency_key: string
          p_discount_total?: number
          p_delivery_fee?: number
        }
        Returns: Database['public']['Tables']['orders']['Row']
      }
      create_pos_order_secure: {
        Args: {
          p_customer_name: string
          p_email: string
          p_phone: string
          p_address: string
          p_notes: string | null
          p_items: Json
          p_payment_method?: string
          p_amount_paid?: number | null
          p_payment_note?: string | null
        }
        Returns: Database['public']['Tables']['orders']['Row']
      }
      get_order_tracking: {
        Args: {
          p_order_id: string
          p_tracking_token: string
        }
        Returns: {
          id: string
          customer_name: string
          email: string
          phone: string | null
          address: string | null
          total: number
          status: Database['public']['Enums']['order_status']
          payment_status: Database['public']['Enums']['payment_status']
          amount_paid: number
          balance_due: number
          created_at: string
          updated_at: string
          last_status_changed_at: string
          estimated_delivery_at: string | null
          notes: string | null
          status_history: Array<{
            id: string
            old_status: Database['public']['Enums']['order_status'] | null
            new_status: Database['public']['Enums']['order_status']
            changed_at: string
            note: string | null
          }>
          items: Array<{
            id: string
            quantity: number
            price: number
            item_name: string | null
            item_reference: string | null
            product: { name: string; images: string[] } | null
          }>
        } | null
      }
      update_order_status_secure: {
        Args: {
          p_order_id: string
          p_status: Database['public']['Enums']['order_status']
          p_estimated_delivery_at?: string | null
          p_update_estimate?: boolean
        }
        Returns: Database['public']['Tables']['orders']['Row']
      }
      get_sales_stats: {
        Args: Record<string, never>
        Returns: {
          total_revenue: number
          total_orders: number
          total_customers: number
          average_order_value: number
          revenue_growth: number
          orders_growth: number
          customers_growth: number
          top_products: Array<{ name: string; total_sales: number; revenue: number }>
          sales_by_category: Array<{ name: string; total_sales: number; revenue: number }>
        }
      }
      get_customer_stats: {
        Args: Record<string, never>
        Returns: Array<{
          email: string
          customer_name: string
          phone: string
          address: string
          total_orders: number
          total_spent: number
          last_order_date: string
        }>
      }
    }
    CompositeTypes: Record<string, never>
  }
}
