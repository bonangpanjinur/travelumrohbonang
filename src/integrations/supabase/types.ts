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
      advantages: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          branch_id: string | null
          commission_percent: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
        }
        Insert: {
          branch_id?: string | null
          commission_percent?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
        }
        Update: {
          branch_id?: string | null
          commission_percent?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      airlines: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      airports: {
        Row: {
          city: string | null
          code: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          city?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          city?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          is_published: boolean | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      booking_pilgrims: {
        Row: {
          birth_date: string | null
          booking_id: string | null
          created_at: string | null
          email: string | null
          gender: string | null
          id: string
          name: string
          nik: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
        }
        Insert: {
          birth_date?: string | null
          booking_id?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          name: string
          nik?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
        }
        Update: {
          birth_date?: string | null
          booking_id?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          name?: string
          nik?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_pilgrims_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_rooms: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          price: number
          quantity: number
          room_type: string
          subtotal: number
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          price: number
          quantity: number
          room_type: string
          subtotal: number
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          price?: number
          quantity?: number
          room_type?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_rooms_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_code: string
          created_at: string | null
          departure_id: string | null
          id: string
          notes: string | null
          package_id: string | null
          pic_id: string | null
          pic_type: string | null
          status: string | null
          total_price: number
          user_id: string | null
        }
        Insert: {
          booking_code: string
          created_at?: string | null
          departure_id?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          pic_id?: string | null
          pic_type?: string | null
          status?: string | null
          total_price?: number
          user_id?: string | null
        }
        Update: {
          booking_code?: string
          created_at?: string | null
          departure_id?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          pic_id?: string | null
          pic_type?: string | null
          status?: string | null
          total_price?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "package_departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          discount_type: string
          expired_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_purchase: number | null
          used_count: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type: string
          expired_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_purchase?: number | null
          used_count?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: string
          expired_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_purchase?: number | null
          used_count?: number | null
          value?: number
        }
        Relationships: []
      }
      departure_prices: {
        Row: {
          created_at: string | null
          departure_id: string | null
          id: string
          price: number
          room_type: string
        }
        Insert: {
          created_at?: string | null
          departure_id?: string | null
          id?: string
          price: number
          room_type: string
        }
        Update: {
          created_at?: string | null
          departure_id?: string | null
          id?: string
          price?: number
          room_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "departure_prices_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "package_departures"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      floating_buttons: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          label: string
          platform: string
          sort_order: number | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          platform: string
          sort_order?: number | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          platform?: string
          sort_order?: number | null
          url?: string | null
        }
        Relationships: []
      }
      gallery: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          sort_order: number | null
          title: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string | null
        }
        Relationships: []
      }
      guide_steps: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          step_number: number
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          step_number: number
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          step_number?: number
          title?: string
        }
        Relationships: []
      }
      hotels: {
        Row: {
          city: string | null
          created_at: string | null
          id: string
          name: string
          star: number | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          id?: string
          name: string
          star?: number | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          id?: string
          name?: string
          star?: number | null
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          created_at: string | null
          departure_id: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          departure_id?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          departure_id?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "package_departures"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_days: {
        Row: {
          created_at: string | null
          day_number: number
          description: string | null
          id: string
          image_url: string | null
          itinerary_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          day_number: number
          description?: string | null
          id?: string
          image_url?: string | null
          itinerary_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          day_number?: number
          description?: string | null
          id?: string
          image_url?: string | null
          itinerary_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      muthawifs: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
        }
        Relationships: []
      }
      navigation_items: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          open_in_new_tab: boolean | null
          parent_id: string | null
          sort_order: number | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          open_in_new_tab?: boolean | null
          parent_id?: string | null
          sort_order?: number | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          open_in_new_tab?: boolean | null
          parent_id?: string | null
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      package_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "package_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "package_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      package_commissions: {
        Row: {
          commission_amount: number
          created_at: string | null
          id: string
          package_id: string
          pic_type: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string | null
          id?: string
          package_id: string
          pic_type: string
        }
        Update: {
          commission_amount?: number
          created_at?: string | null
          id?: string
          package_id?: string
          pic_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_commissions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_departures: {
        Row: {
          created_at: string | null
          departure_date: string
          id: string
          muthawif_id: string | null
          package_id: string | null
          quota: number
          remaining_quota: number
          return_date: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          departure_date: string
          id?: string
          muthawif_id?: string | null
          package_id?: string | null
          quota: number
          remaining_quota: number
          return_date?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          departure_date?: string
          id?: string
          muthawif_id?: string | null
          package_id?: string | null
          quota?: number
          remaining_quota?: number
          return_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_departures_muthawif_id_fkey"
            columns: ["muthawif_id"]
            isOneToOne: false
            referencedRelation: "muthawifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_departures_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          airline_id: string | null
          airport_id: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          dp_deadline_days: number | null
          duration_days: number | null
          full_deadline_days: number | null
          hotel_madinah_id: string | null
          hotel_makkah_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          minimum_dp: number | null
          package_type: string | null
          slug: string
          title: string
        }
        Insert: {
          airline_id?: string | null
          airport_id?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          dp_deadline_days?: number | null
          duration_days?: number | null
          full_deadline_days?: number | null
          hotel_madinah_id?: string | null
          hotel_makkah_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          minimum_dp?: number | null
          package_type?: string | null
          slug: string
          title: string
        }
        Update: {
          airline_id?: string | null
          airport_id?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          dp_deadline_days?: number | null
          duration_days?: number | null
          full_deadline_days?: number | null
          hotel_madinah_id?: string | null
          hotel_makkah_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          minimum_dp?: number | null
          package_type?: string | null
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_airport_id_fkey"
            columns: ["airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "package_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_hotel_madinah_id_fkey"
            columns: ["hotel_madinah_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_hotel_makkah_id_fkey"
            columns: ["hotel_makkah_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string | null
          deadline: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_type: string | null
          proof_url: string | null
          status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_type?: string | null
          proof_url?: string | null
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_type?: string | null
          proof_url?: string | null
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_active: boolean | null
          page_slug: string | null
          section_type: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_active?: boolean | null
          page_slug?: string | null
          section_type?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_active?: boolean | null
          page_slug?: string | null
          section_type?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          category: string
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          package_name: string | null
          photo_url: string | null
          rating: number | null
          sort_order: number | null
          travel_date: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          package_name?: string | null
          photo_url?: string | null
          rating?: number | null
          sort_order?: number | null
          travel_date?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          package_name?: string | null
          photo_url?: string | null
          rating?: number | null
          sort_order?: number | null
          travel_date?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_booking_code: { Args: never; Returns: string }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
