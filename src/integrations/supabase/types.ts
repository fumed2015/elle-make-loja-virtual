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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blog_posts: {
        Row: {
          author_name: string | null
          content: string | null
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          author_name?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          author_name?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      cart_abandonment_events: {
        Row: {
          cart_total: number
          created_at: string
          id: string
          items_count: number
          notification_count: number
          notified_at: string | null
          recovered_at: string | null
          recovery_token: string | null
          step: string
          user_id: string
        }
        Insert: {
          cart_total?: number
          created_at?: string
          id?: string
          items_count?: number
          notification_count?: number
          notified_at?: string | null
          recovered_at?: string | null
          recovery_token?: string | null
          step?: string
          user_id: string
        }
        Update: {
          cart_total?: number
          created_at?: string
          id?: string
          items_count?: number
          notification_count?: number
          notified_at?: string | null
          recovered_at?: string | null
          recovery_token?: string | null
          step?: string
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          selected_swatch: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          selected_swatch?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          selected_swatch?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_import_failures: {
        Row: {
          attempts: number
          brand_name: string
          created_at: string
          error_category: string | null
          error_message: string | null
          file_id: string
          file_name: string
          file_size_bytes: number | null
          id: string
          import_id: string
          retry_guidance: string | null
        }
        Insert: {
          attempts?: number
          brand_name: string
          created_at?: string
          error_category?: string | null
          error_message?: string | null
          file_id: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          import_id: string
          retry_guidance?: string | null
        }
        Update: {
          attempts?: number
          brand_name?: string
          created_at?: string
          error_category?: string | null
          error_message?: string | null
          file_id?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          import_id?: string
          retry_guidance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_import_failures_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "catalog_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_imports: {
        Row: {
          created_at: string
          error_message: string | null
          folder_id: string
          folder_name: string | null
          id: string
          processed_files: number | null
          status: string
          supplier_name: string | null
          total_files: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          folder_id: string
          folder_name?: string | null
          id?: string
          processed_files?: number | null
          status?: string
          supplier_name?: string | null
          total_files?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          folder_id?: string
          folder_name?: string | null
          id?: string
          processed_files?: number | null
          status?: string
          supplier_name?: string | null
          total_files?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      catalog_items: {
        Row: {
          brand: string
          category: string | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          id: string
          image_urls: string[] | null
          import_id: string | null
          price: number | null
          product_name: string
          raw_data: Json | null
          source_file: string | null
          tags: string[] | null
        }
        Insert: {
          brand: string
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          import_id?: string | null
          price?: number | null
          product_name: string
          raw_data?: Json | null
          source_file?: string | null
          tags?: string[] | null
        }
        Update: {
          brand?: string
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          import_id?: string | null
          price?: number | null
          product_name?: string
          raw_data?: Json | null
          source_file?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "catalog_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          influencer_id: string | null
          is_active: boolean | null
          max_uses: number | null
          min_order_value: number | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          influencer_id?: string | null
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          influencer_id?: string | null
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_premises: {
        Row: {
          created_at: string
          desired_margin: number
          fixed_cost_extra1: number
          fixed_cost_extra1_label: string
          fixed_cost_extra2: number
          fixed_cost_extra2_label: string
          fixed_cost_extra3: number
          fixed_cost_extra3_label: string
          fixed_cost_other: number
          fixed_cost_other_label: string | null
          fixed_cost_platform: number
          fixed_cost_platform_label: string
          fixed_cost_whatsgw: number
          fixed_cost_whatsgw_label: string
          freight_batch_items: number
          freight_batch_total: number
          gateway_rate_credit: number
          gateway_rate_credit_fixed: number
          gateway_rate_debit: number
          gateway_rate_physical: number
          gateway_rate_pix: number
          id: string
          influencer_commission_rate: number
          local_shipping_fee: number
          marketing_budget: number
          monthly_revenue_goal: number
          order_target: number
          packaging_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          desired_margin?: number
          fixed_cost_extra1?: number
          fixed_cost_extra1_label?: string
          fixed_cost_extra2?: number
          fixed_cost_extra2_label?: string
          fixed_cost_extra3?: number
          fixed_cost_extra3_label?: string
          fixed_cost_other?: number
          fixed_cost_other_label?: string | null
          fixed_cost_platform?: number
          fixed_cost_platform_label?: string
          fixed_cost_whatsgw?: number
          fixed_cost_whatsgw_label?: string
          freight_batch_items?: number
          freight_batch_total?: number
          gateway_rate_credit?: number
          gateway_rate_credit_fixed?: number
          gateway_rate_debit?: number
          gateway_rate_physical?: number
          gateway_rate_pix?: number
          id?: string
          influencer_commission_rate?: number
          local_shipping_fee?: number
          marketing_budget?: number
          monthly_revenue_goal?: number
          order_target?: number
          packaging_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          desired_margin?: number
          fixed_cost_extra1?: number
          fixed_cost_extra1_label?: string
          fixed_cost_extra2?: number
          fixed_cost_extra2_label?: string
          fixed_cost_extra3?: number
          fixed_cost_extra3_label?: string
          fixed_cost_other?: number
          fixed_cost_other_label?: string | null
          fixed_cost_platform?: number
          fixed_cost_platform_label?: string
          fixed_cost_whatsgw?: number
          fixed_cost_whatsgw_label?: string
          freight_batch_items?: number
          freight_batch_total?: number
          gateway_rate_credit?: number
          gateway_rate_credit_fixed?: number
          gateway_rate_debit?: number
          gateway_rate_physical?: number
          gateway_rate_pix?: number
          id?: string
          influencer_commission_rate?: number
          local_shipping_fee?: number
          marketing_budget?: number
          monthly_revenue_goal?: number
          order_target?: number
          packaging_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_commissions: {
        Row: {
          commission_percent: number
          commission_value: number
          created_at: string
          id: string
          influencer_id: string
          order_id: string
          order_total: number
          status: string
        }
        Insert: {
          commission_percent: number
          commission_value: number
          created_at?: string
          id?: string
          influencer_id: string
          order_id: string
          order_total: number
          status?: string
        }
        Update: {
          commission_percent?: number
          commission_value?: number
          created_at?: string
          id?: string
          influencer_id?: string
          order_id?: string
          order_total?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_commissions_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      influencers: {
        Row: {
          commission_percent: number
          created_at: string
          id: string
          instagram: string | null
          is_active: boolean | null
          name: string
          total_commission: number | null
          total_sales: number | null
          user_id: string
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          name: string
          total_commission?: number | null
          total_sales?: number | null
          user_id: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          name?: string
          total_commission?: number | null
          total_sales?: number | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          coupon_code: string | null
          created_at: string
          date: string | null
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_configs: {
        Row: {
          api_key: string | null
          auto_sync: boolean
          created_at: string
          enabled: boolean
          id: string
          marketplace_id: string
          markup_percent: number
          price_rule: string
          seller_id: string | null
          shipping_mode: string
          status: string
          sync_frequency: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          auto_sync?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          marketplace_id: string
          markup_percent?: number
          price_rule?: string
          seller_id?: string | null
          shipping_mode?: string
          status?: string
          sync_frequency?: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          auto_sync?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          marketplace_id?: string
          markup_percent?: number
          price_rule?: string
          seller_id?: string | null
          shipping_mode?: string
          status?: string
          sync_frequency?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          created_at: string
          external_id: string | null
          external_url: string | null
          id: string
          last_synced_at: string | null
          marketplace: string
          metadata: Json | null
          product_id: string
          status: string
          sync_error: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          last_synced_at?: string | null
          marketplace: string
          metadata?: Json | null
          product_id: string
          status?: string
          sync_error?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          last_synced_at?: string | null
          marketplace?: string
          metadata?: Json | null
          product_id?: string
          status?: string
          sync_error?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          external_order_id: string
          id: string
          internal_order_id: string | null
          items: Json
          marketplace: string
          marketplace_fee: number | null
          raw_data: Json | null
          shipping_address: Json | null
          shipping_cost: number | null
          shipping_status: string | null
          status: string
          total: number
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          external_order_id: string
          id?: string
          internal_order_id?: string | null
          items?: Json
          marketplace: string
          marketplace_fee?: number | null
          raw_data?: Json | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          shipping_status?: string | null
          status?: string
          total?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          external_order_id?: string
          id?: string
          internal_order_id?: string | null
          items?: Json
          marketplace?: string
          marketplace_fee?: number | null
          raw_data?: Json | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          shipping_status?: string | null
          status?: string
          total?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_internal_order_id_fkey"
            columns: ["internal_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_sync_logs: {
        Row: {
          completed_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          items_failed: number | null
          items_processed: number | null
          marketplace: string
          operation: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          items_failed?: number | null
          items_processed?: number | null
          marketplace: string
          operation: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          items_failed?: number | null
          items_processed?: number | null
          marketplace?: string
          operation?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      marketplace_tokens: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          extra: Json | null
          id: string
          marketplace: string
          refresh_token: string | null
          seller_id: string | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          extra?: Json | null
          id?: string
          marketplace: string
          refresh_token?: string | null
          seller_id?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          extra?: Json | null
          id?: string
          marketplace?: string
          refresh_token?: string | null
          seller_id?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          created_at: string
          event_type: string
          id: string
          is_active: boolean
          template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          is_active?: boolean
          template: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          is_active?: boolean
          template?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          name: string | null
          source: string | null
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          name?: string | null
          source?: string | null
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          source?: string | null
          subscribed_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          event_type: string
          id: string
          message: string
          order_id: string | null
          phone: string
          status: string
          user_id: string | null
          zapi_response: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          message: string
          order_id?: string | null
          phone: string
          status?: string
          user_id?: string | null
          zapi_response?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          message?: string
          order_id?: string | null
          phone?: string
          status?: string
          user_id?: string | null
          zapi_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          discount: number | null
          estimated_delivery: string | null
          id: string
          influencer_id: string | null
          items: Json
          notes: string | null
          payment_method: string | null
          shipping_address: Json | null
          status: string
          total: number
          tracking_code: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          discount?: number | null
          estimated_delivery?: string | null
          id?: string
          influencer_id?: string | null
          items?: Json
          notes?: string | null
          payment_method?: string | null
          shipping_address?: Json | null
          status?: string
          total: number
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          discount?: number | null
          estimated_delivery?: string | null
          id?: string
          influencer_id?: string | null
          items?: Json
          notes?: string | null
          payment_method?: string | null
          shipping_address?: Json | null
          status?: string
          total?: number
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      premises_audit_log: {
        Row: {
          changed_fields: Json
          created_at: string
          id: string
          new_values: Json
          old_values: Json
          user_email: string | null
          user_id: string
        }
        Insert: {
          changed_fields?: Json
          created_at?: string
          id?: string
          new_values?: Json
          old_values?: Json
          user_email?: string | null
          user_id: string
        }
        Update: {
          changed_fields?: Json
          created_at?: string
          id?: string
          new_values?: Json
          old_values?: Json
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_costs: {
        Row: {
          cost_base: number
          created_at: string
          freight_per_unit: number
          id: string
          notes: string | null
          product_id: string
          updated_at: string
        }
        Insert: {
          cost_base?: number
          created_at?: string
          freight_per_unit?: number
          id?: string
          notes?: string | null
          product_id: string
          updated_at?: string
        }
        Update: {
          cost_base?: number
          created_at?: string
          freight_per_unit?: number
          id?: string
          notes?: string | null
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          how_to_use: string | null
          id: string
          images: string[] | null
          ingredients: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          price: number
          sensorial_description: string | null
          slug: string
          stock: number
          swatches: Json | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          how_to_use?: string | null
          id?: string
          images?: string[] | null
          ingredients?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          price: number
          sensorial_description?: string | null
          slug: string
          stock?: number
          swatches?: Json | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          how_to_use?: string | null
          id?: string
          images?: string[] | null
          ingredients?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          price?: number
          sensorial_description?: string | null
          slug?: string
          stock?: number
          swatches?: Json | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: Json | null
          admin_notes: string | null
          avatar_url: string | null
          birthday: string | null
          cpf: string | null
          created_at: string
          full_name: string | null
          id: string
          instagram: string | null
          loyalty_tier: string | null
          phone: string | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: Json | null
          admin_notes?: string | null
          avatar_url?: string | null
          birthday?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          instagram?: string | null
          loyalty_tier?: string | null
          phone?: string | null
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: Json | null
          admin_notes?: string | null
          avatar_url?: string | null
          birthday?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          instagram?: string | null
          loyalty_tier?: string | null
          phone?: string | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          description: string | null
          discount_type: string | null
          discount_value: number | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          position: string | null
          product_ids: string[] | null
          sort_order: number | null
          starts_at: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          position?: string | null
          product_ids?: string[] | null
          sort_order?: number | null
          starts_at?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          position?: string | null
          product_ids?: string[] | null
          sort_order?: number | null
          starts_at?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      returns: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          items: Json
          notes: string | null
          order_id: string
          reason: string
          refund_amount: number | null
          status: string
          tracking_code: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          order_id: string
          reason: string
          refund_amount?: number | null
          status?: string
          tracking_code?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string
          reason?: string
          refund_amount?: number | null
          status?: string
          tracking_code?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          images: string[] | null
          is_approved: boolean | null
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          id: string
          is_default: boolean | null
          label: string
          neighborhood: string
          number: string
          state: string
          street: string
          user_id: string
          zip: string
        }
        Insert: {
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          neighborhood: string
          number: string
          state?: string
          street: string
          user_id: string
          zip: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          neighborhood?: string
          number?: string
          state?: string
          street?: string
          user_id?: string
          zip?: string
        }
        Relationships: []
      }
      seo_reports: {
        Row: {
          created_at: string
          id: string
          products_without_description: number | null
          products_without_images: number | null
          report: Json
          score: number | null
          sitemap_urls: number | null
          total_categories: number | null
          total_products: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          products_without_description?: number | null
          products_without_images?: number | null
          report?: Json
          score?: number | null
          sitemap_urls?: number | null
          total_categories?: number | null
          total_products?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          products_without_description?: number | null
          products_without_images?: number | null
          report?: Json
          score?: number | null
          sitemap_urls?: number | null
          total_categories?: number | null
          total_products?: number | null
        }
        Relationships: []
      }
      tracking_pixels: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          pixel_code: string
          platform: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          pixel_code: string
          platform: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          pixel_code?: string
          platform?: string
        }
        Relationships: []
      }
      ugc_posts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          is_approved: boolean | null
          product_id: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_approved?: boolean | null
          product_id?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_approved?: boolean | null
          product_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "customer" | "staff"
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
      app_role: ["admin", "moderator", "customer", "staff"],
    },
  },
} as const
