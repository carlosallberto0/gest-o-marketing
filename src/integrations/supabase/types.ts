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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          code: string
          created_at: string
          description: string | null
          end_date: string
          id: string
          kpi_targets: Json
          name: string
          required_materials: Json
          start_date: string
          status: string
          target_pdv_ids: string[]
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          kpi_targets?: Json
          name: string
          required_materials?: Json
          start_date: string
          status?: string
          target_pdv_ids?: string[]
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          kpi_targets?: Json
          name?: string
          required_materials?: Json
          start_date?: string
          status?: string
          target_pdv_ids?: string[]
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
        }
        Relationships: []
      }
      checklist_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      checklist_questions: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_critical: boolean
          material_type: Database["public"]["Enums"]["material_type"] | null
          requires_material: boolean
          requires_photo: boolean
          sort_order: number
          text: string
          tip: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_critical?: boolean
          material_type?: Database["public"]["Enums"]["material_type"] | null
          requires_material?: boolean
          requires_photo?: boolean
          sort_order?: number
          text: string
          tip?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_critical?: boolean
          material_type?: Database["public"]["Enums"]["material_type"] | null
          requires_material?: boolean
          requires_photo?: boolean
          sort_order?: number
          text?: string
          tip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "checklist_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          annual_value: number
          auto_renewal: boolean
          created_at: string
          document_url: string | null
          end_date: string
          farmer_cpf: string
          farmer_email: string | null
          farmer_name: string
          farmer_phone: string | null
          id: string
          monthly_value: number
          outdoor_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          annual_value: number
          auto_renewal?: boolean
          created_at?: string
          document_url?: string | null
          end_date: string
          farmer_cpf: string
          farmer_email?: string | null
          farmer_name: string
          farmer_phone?: string | null
          id?: string
          monthly_value: number
          outdoor_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          annual_value?: number
          auto_renewal?: boolean
          created_at?: string
          document_url?: string | null
          end_date?: string
          farmer_cpf?: string
          farmer_email?: string | null
          farmer_name?: string
          farmer_phone?: string | null
          id?: string
          monthly_value?: number
          outdoor_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_outdoor_id_fkey"
            columns: ["outdoor_id"]
            isOneToOne: false
            referencedRelation: "outdoors"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_answers: {
        Row: {
          created_at: string
          evaluation_id: string
          id: string
          materials_used: string[] | null
          observation: string | null
          photo_url: string | null
          question_id: string
          value: Database["public"]["Enums"]["answer_value"] | null
        }
        Insert: {
          created_at?: string
          evaluation_id: string
          id?: string
          materials_used?: string[] | null
          observation?: string | null
          photo_url?: string | null
          question_id: string
          value?: Database["public"]["Enums"]["answer_value"] | null
        }
        Update: {
          created_at?: string
          evaluation_id?: string
          id?: string
          materials_used?: string[] | null
          observation?: string | null
          photo_url?: string | null
          question_id?: string
          value?: Database["public"]["Enums"]["answer_value"] | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_answers_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "merch_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "checklist_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      media_evaluation_photos: {
        Row: {
          created_at: string
          evaluation_id: string
          id: string
          photo_url: string
        }
        Insert: {
          created_at?: string
          evaluation_id: string
          id?: string
          photo_url: string
        }
        Update: {
          created_at?: string
          evaluation_id?: string
          id?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_evaluation_photos_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "media_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_evaluations: {
        Row: {
          evaluated_at: string
          evaluator_id: string
          id: string
          lat: number | null
          lng: number | null
          measures_confirmed: boolean
          month_year: string
          non_operational_reason: string | null
          observations: string | null
          outdoor_id: string
          pdv_id: string
          status: Database["public"]["Enums"]["outdoor_status"]
        }
        Insert: {
          evaluated_at?: string
          evaluator_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          measures_confirmed?: boolean
          month_year: string
          non_operational_reason?: string | null
          observations?: string | null
          outdoor_id: string
          pdv_id: string
          status: Database["public"]["Enums"]["outdoor_status"]
        }
        Update: {
          evaluated_at?: string
          evaluator_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          measures_confirmed?: boolean
          month_year?: string
          non_operational_reason?: string | null
          observations?: string | null
          outdoor_id?: string
          pdv_id?: string
          status?: Database["public"]["Enums"]["outdoor_status"]
        }
        Relationships: [
          {
            foreignKeyName: "media_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_evaluations_outdoor_id_fkey"
            columns: ["outdoor_id"]
            isOneToOne: false
            referencedRelation: "outdoors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_evaluations_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "pdvs"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_evaluations: {
        Row: {
          category_scores: Json
          completed_at: string | null
          created_at: string
          evaluation_date: string
          evaluator_id: string
          id: string
          pdv_id: string
          percentage_score: number
          signature_url: string | null
          status: string
          total_possible_points: number
          total_score: number
        }
        Insert: {
          category_scores?: Json
          completed_at?: string | null
          created_at?: string
          evaluation_date?: string
          evaluator_id: string
          id?: string
          pdv_id: string
          percentage_score?: number
          signature_url?: string | null
          status?: string
          total_possible_points?: number
          total_score?: number
        }
        Update: {
          category_scores?: Json
          completed_at?: string | null
          created_at?: string
          evaluation_date?: string
          evaluator_id?: string
          id?: string
          pdv_id?: string
          percentage_score?: number
          signature_url?: string | null
          status?: string
          total_possible_points?: number
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "merch_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merch_evaluations_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "pdvs"
            referencedColumns: ["id"]
          },
        ]
      }
      outdoors: {
        Row: {
          area: number | null
          code: string
          contract_id: string | null
          created_at: string
          height: number
          id: string
          last_evaluation: string | null
          location: string
          non_operational_reason: string | null
          ownership_type: string | null
          pdv_id: string
          photo_url: string | null
          status: Database["public"]["Enums"]["outdoor_status"]
          supplier_id: string | null
          updated_at: string
          width: number
        }
        Insert: {
          area?: number | null
          code: string
          contract_id?: string | null
          created_at?: string
          height: number
          id?: string
          last_evaluation?: string | null
          location: string
          non_operational_reason?: string | null
          ownership_type?: string | null
          pdv_id: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["outdoor_status"]
          supplier_id?: string | null
          updated_at?: string
          width: number
        }
        Update: {
          area?: number | null
          code?: string
          contract_id?: string | null
          created_at?: string
          height?: number
          id?: string
          last_evaluation?: string | null
          location?: string
          non_operational_reason?: string | null
          ownership_type?: string | null
          pdv_id?: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["outdoor_status"]
          supplier_id?: string | null
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_outdoors_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outdoors_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "pdvs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outdoors_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pdvs: {
        Row: {
          active_modules: Database["public"]["Enums"]["module_access"][]
          address: string
          city: string
          code: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          manager_id: string | null
          name: string
          photo_url: string | null
          state: string
          status: string
          type: Database["public"]["Enums"]["pdv_type"]
          updated_at: string
        }
        Insert: {
          active_modules?: Database["public"]["Enums"]["module_access"][]
          address: string
          city: string
          code: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          manager_id?: string | null
          name: string
          photo_url?: string | null
          state: string
          status?: string
          type: Database["public"]["Enums"]["pdv_type"]
          updated_at?: string
        }
        Update: {
          active_modules?: Database["public"]["Enums"]["module_access"][]
          address?: string
          city?: string
          code?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          manager_id?: string | null
          name?: string
          photo_url?: string | null
          state?: string
          status?: string
          type?: Database["public"]["Enums"]["pdv_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdvs_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          email: string
          id: string
          modules: Database["public"]["Enums"]["module_access"][]
          name: string
          pdv_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email: string
          id: string
          modules?: Database["public"]["Enums"]["module_access"][]
          name: string
          pdv_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          modules?: Database["public"]["Enums"]["module_access"][]
          name?: string
          pdv_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_pdv"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "pdvs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          approved_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          id: string
          number: string
          outdoor_id: string
          pdf_url: string | null
          status: Database["public"]["Enums"]["service_order_status"]
          supplier_id: string
          total_cost: number
          type: Database["public"]["Enums"]["service_type"]
        }
        Insert: {
          approved_at?: string | null
          completed_at?: string | null
          created_at?: string
          description: string
          id?: string
          number: string
          outdoor_id: string
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          supplier_id: string
          total_cost: number
          type: Database["public"]["Enums"]["service_type"]
        }
        Update: {
          approved_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          number?: string
          outdoor_id?: string
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          supplier_id?: string
          total_cost?: number
          type?: Database["public"]["Enums"]["service_type"]
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_outdoor_id_fkey"
            columns: ["outdoor_id"]
            isOneToOne: false
            referencedRelation: "outdoors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string
          cnpj: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          service_types: Database["public"]["Enums"]["service_type"][]
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          cnpj: string
          created_at?: string
          email: string
          id?: string
          name: string
          phone: string
          service_types?: Database["public"]["Enums"]["service_type"][]
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          cnpj?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          service_types?: Database["public"]["Enums"]["service_type"][]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      trade_materials: {
        Row: {
          category: string
          code: string
          created_at: string
          current_stock: number
          description: string | null
          id: string
          image_url: string | null
          minimum_stock: number
          name: string
          status: string
          type: Database["public"]["Enums"]["material_type"]
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          image_url?: string | null
          minimum_stock?: number
          name: string
          status?: string
          type: Database["public"]["Enums"]["material_type"]
          unit_cost: number
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          image_url?: string | null
          minimum_stock?: number
          name?: string
          status?: string
          type?: Database["public"]["Enums"]["material_type"]
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_module_access: {
        Args: {
          module_name: Database["public"]["Enums"]["module_access"]
          user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      answer_value: "yes" | "no" | "na"
      campaign_type:
        | "promotional"
        | "institutional"
        | "seasonal"
        | "launch"
        | "partnership"
      material_type:
        | "promotional"
        | "printed"
        | "gift"
        | "sample"
        | "display"
        | "signage"
        | "sticker"
        | "banner"
        | "poster"
        | "flyer"
      module_access: "media" | "merchandising"
      outdoor_status: "operational" | "non_operational" | "pending_evaluation"
      payment_method: "cash" | "fuel" | "both"
      pdv_type: "posto" | "conveniencia" | "both"
      service_order_status:
        | "pending"
        | "approved"
        | "in_progress"
        | "completed"
        | "cancelled"
      service_type: "installation" | "maintenance" | "removal" | "replacement"
      user_role:
        | "super_admin"
        | "admin"
        | "director"
        | "manager"
        | "collaborator"
        | "supplier"
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
      answer_value: ["yes", "no", "na"],
      campaign_type: [
        "promotional",
        "institutional",
        "seasonal",
        "launch",
        "partnership",
      ],
      material_type: [
        "promotional",
        "printed",
        "gift",
        "sample",
        "display",
        "signage",
        "sticker",
        "banner",
        "poster",
        "flyer",
      ],
      module_access: ["media", "merchandising"],
      outdoor_status: ["operational", "non_operational", "pending_evaluation"],
      payment_method: ["cash", "fuel", "both"],
      pdv_type: ["posto", "conveniencia", "both"],
      service_order_status: [
        "pending",
        "approved",
        "in_progress",
        "completed",
        "cancelled",
      ],
      service_type: ["installation", "maintenance", "removal", "replacement"],
      user_role: [
        "super_admin",
        "admin",
        "director",
        "manager",
        "collaborator",
        "supplier",
      ],
    },
  },
} as const
