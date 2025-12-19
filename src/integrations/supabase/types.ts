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
      action_plans: {
        Row: {
          answer_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string
          evaluation_id: string
          id: string
          notes: string | null
          responsible_id: string | null
          status: string
        }
        Insert: {
          answer_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description: string
          due_date: string
          evaluation_id: string
          id?: string
          notes?: string | null
          responsible_id?: string | null
          status?: string
        }
        Update: {
          answer_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          evaluation_id?: string
          id?: string
          notes?: string | null
          responsible_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "evaluation_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "merch_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          related_type: string | null
          severity: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          related_type?: string | null
          severity?: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          related_type?: string | null
          severity?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      evaluation_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          evaluation_id: string
          id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          evaluation_id: string
          id?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          evaluation_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_comments_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "merch_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_lotes: {
        Row: {
          arquivo_nome: string
          created_at: string
          erros: Json | null
          id: string
          quantidade_outdoors: number | null
          quantidade_postos: number | null
          status: string
          usuario_id: string | null
        }
        Insert: {
          arquivo_nome: string
          created_at?: string
          erros?: Json | null
          id?: string
          quantidade_outdoors?: number | null
          quantidade_postos?: number | null
          status?: string
          usuario_id?: string | null
        }
        Update: {
          arquivo_nome?: string
          created_at?: string
          erros?: Json | null
          id?: string
          quantidade_outdoors?: number | null
          quantidade_postos?: number | null
          status?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_lotes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          evaluation_id: string | null
          id: string
          observations: string | null
          outdoor_id: string
          photos: string[] | null
          reason: string
          requester_id: string
          service_order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          evaluation_id?: string | null
          id?: string
          observations?: string | null
          outdoor_id: string
          photos?: string[] | null
          reason: string
          requester_id: string
          service_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          evaluation_id?: string | null
          id?: string
          observations?: string | null
          outdoor_id?: string
          photos?: string[] | null
          reason?: string
          requester_id?: string
          service_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "media_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_outdoor_id_fkey"
            columns: ["outdoor_id"]
            isOneToOne: false
            referencedRelation: "outdoors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requests: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          delivered_at: string | null
          id: string
          justification: string
          material_id: string
          pdv_id: string
          quantity: number
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          justification: string
          material_id: string
          pdv_id: string
          quantity: number
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          justification?: string
          material_id?: string
          pdv_id?: string
          quantity?: number
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "trade_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "pdvs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      notificacoes_sistema: {
        Row: {
          criada_em: string | null
          id: string
          id_referencia: string | null
          lida: boolean | null
          mensagem: string
          modulo: string
          tipo: string
          tipo_referencia: string | null
          titulo: string
          url_acao: string | null
          usuario_id: string | null
        }
        Insert: {
          criada_em?: string | null
          id?: string
          id_referencia?: string | null
          lida?: boolean | null
          mensagem: string
          modulo: string
          tipo: string
          tipo_referencia?: string | null
          titulo: string
          url_acao?: string | null
          usuario_id?: string | null
        }
        Update: {
          criada_em?: string | null
          id?: string
          id_referencia?: string | null
          lida?: boolean | null
          mensagem?: string
          modulo?: string
          tipo?: string
          tipo_referencia?: string | null
          titulo?: string
          url_acao?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_sistema_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outdoor_geolocation_history: {
        Row: {
          accuracy: number | null
          captured_by: string | null
          created_at: string
          distance_from_outdoor: number | null
          evaluation_id: string | null
          id: string
          is_valid: boolean | null
          latitude: number
          longitude: number
          outdoor_id: string
          photo_url: string | null
          validation_notes: string | null
        }
        Insert: {
          accuracy?: number | null
          captured_by?: string | null
          created_at?: string
          distance_from_outdoor?: number | null
          evaluation_id?: string | null
          id?: string
          is_valid?: boolean | null
          latitude: number
          longitude: number
          outdoor_id: string
          photo_url?: string | null
          validation_notes?: string | null
        }
        Update: {
          accuracy?: number | null
          captured_by?: string | null
          created_at?: string
          distance_from_outdoor?: number | null
          evaluation_id?: string | null
          id?: string
          is_valid?: boolean | null
          latitude?: number
          longitude?: number
          outdoor_id?: string
          photo_url?: string | null
          validation_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outdoor_geolocation_history_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outdoor_geolocation_history_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "media_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outdoor_geolocation_history_outdoor_id_fkey"
            columns: ["outdoor_id"]
            isOneToOne: false
            referencedRelation: "outdoors"
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
          fonte_importacao: string | null
          height: number
          id: string
          id_importacao: string | null
          last_evaluation: string | null
          lat: number | null
          lng: number | null
          location: string
          non_operational_reason: string | null
          ownership_type: string | null
          pdv_id: string
          photo_url: string | null
          status: Database["public"]["Enums"]["outdoor_status"]
          status_importacao: string | null
          supplier_id: string | null
          updated_at: string
          validation_radius_meters: number | null
          width: number
        }
        Insert: {
          area?: number | null
          code: string
          contract_id?: string | null
          created_at?: string
          fonte_importacao?: string | null
          height: number
          id?: string
          id_importacao?: string | null
          last_evaluation?: string | null
          lat?: number | null
          lng?: number | null
          location: string
          non_operational_reason?: string | null
          ownership_type?: string | null
          pdv_id: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["outdoor_status"]
          status_importacao?: string | null
          supplier_id?: string | null
          updated_at?: string
          validation_radius_meters?: number | null
          width: number
        }
        Update: {
          area?: number | null
          code?: string
          contract_id?: string | null
          created_at?: string
          fonte_importacao?: string | null
          height?: number
          id?: string
          id_importacao?: string | null
          last_evaluation?: string | null
          lat?: number | null
          lng?: number | null
          location?: string
          non_operational_reason?: string | null
          ownership_type?: string | null
          pdv_id?: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["outdoor_status"]
          status_importacao?: string | null
          supplier_id?: string | null
          updated_at?: string
          validation_radius_meters?: number | null
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
          fonte_importacao: string | null
          id: string
          id_importacao: string | null
          lat: number | null
          lng: number | null
          manager_id: string | null
          name: string
          photo_url: string | null
          state: string
          status: string
          status_importacao: string | null
          type: Database["public"]["Enums"]["pdv_type"]
          updated_at: string
        }
        Insert: {
          active_modules?: Database["public"]["Enums"]["module_access"][]
          address: string
          city: string
          code: string
          created_at?: string
          fonte_importacao?: string | null
          id?: string
          id_importacao?: string | null
          lat?: number | null
          lng?: number | null
          manager_id?: string | null
          name: string
          photo_url?: string | null
          state: string
          status?: string
          status_importacao?: string | null
          type: Database["public"]["Enums"]["pdv_type"]
          updated_at?: string
        }
        Update: {
          active_modules?: Database["public"]["Enums"]["module_access"][]
          address?: string
          city?: string
          code?: string
          created_at?: string
          fonte_importacao?: string | null
          id?: string
          id_importacao?: string | null
          lat?: number | null
          lng?: number | null
          manager_id?: string | null
          name?: string
          photo_url?: string | null
          state?: string
          status?: string
          status_importacao?: string | null
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
          pode_aprovar_os: boolean | null
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
          pode_aprovar_os?: boolean | null
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
          pode_aprovar_os?: boolean | null
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
      service_order_items: {
        Row: {
          created_at: string
          id: string
          maintenance_request_id: string | null
          observations: string | null
          outdoor_id: string
          service_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          maintenance_request_id?: string | null
          observations?: string | null
          outdoor_id: string
          service_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          maintenance_request_id?: string | null
          observations?: string | null
          outdoor_id?: string
          service_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_items_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_outdoor_id_fkey"
            columns: ["outdoor_id"]
            isOneToOne: false
            referencedRelation: "outdoors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
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
      stock_movements: {
        Row: {
          created_at: string
          id: string
          justification: string
          material_id: string
          movement_type: string
          new_stock: number
          previous_stock: number
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          justification: string
          material_id: string
          movement_type: string
          new_stock: number
          previous_stock: number
          quantity: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          justification?: string
          material_id?: string
          movement_type?: string
          new_stock?: number
          previous_stock?: number
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "trade_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      enviar_notificacao: {
        Args: {
          p_id_referencia?: string
          p_mensagem: string
          p_modulo: string
          p_tipo: string
          p_tipo_referencia?: string
          p_titulo: string
          p_url_acao?: string
          p_usuario_id: string
        }
        Returns: string
      }
      generate_contract_alerts: { Args: never; Returns: undefined }
      generate_outdoor_alerts: { Args: never; Returns: undefined }
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
      notificar_diretores_aprovadores: {
        Args: {
          p_id_referencia?: string
          p_mensagem: string
          p_tipo: string
          p_titulo: string
          p_url_acao?: string
        }
        Returns: undefined
      }
      notificar_por_role: {
        Args: {
          p_id_referencia?: string
          p_mensagem: string
          p_modulo: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_tipo: string
          p_tipo_referencia?: string
          p_titulo: string
          p_url_acao?: string
        }
        Returns: undefined
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
        | "pending_director"
        | "director_approved"
        | "validated"
        | "correction_requested"
      service_type: "installation" | "maintenance" | "removal" | "replacement"
      user_role:
        | "super_admin"
        | "admin"
        | "director"
        | "manager"
        | "collaborator"
        | "supplier"
        | "coordenador_compras"
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
        "pending_director",
        "director_approved",
        "validated",
        "correction_requested",
      ],
      service_type: ["installation", "maintenance", "removal", "replacement"],
      user_role: [
        "super_admin",
        "admin",
        "director",
        "manager",
        "collaborator",
        "supplier",
        "coordenador_compras",
      ],
    },
  },
} as const
