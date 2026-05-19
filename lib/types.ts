export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          type: string
          vat_code: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          type: string
          vat_code?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          type?: string
          vat_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_rules: {
        Row: {
          amount_max: number | null
          amount_min: number | null
          approver_user_id: string | null
          created_at: string | null
          department_id: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          priority: number | null
        }
        Insert: {
          amount_max?: number | null
          amount_min?: number | null
          approver_user_id?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          priority?: number | null
        }
        Update: {
          amount_max?: number | null
          amount_min?: number | null
          approver_user_id?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          organization_id: string
          resource_id: string | null
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id: string
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          manager_email: string | null
          name: string
          organization_id: string
          status: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          manager_email?: string | null
          name: string
          organization_id: string
          status?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          manager_email?: string | null
          name?: string
          organization_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_items: {
        Row: {
          account_id: string | null
          amount: number
          category: string | null
          currency: string | null
          date: string
          description: string
          expense_report_id: string
          id: string
          receipt_url: string | null
          sort_order: number | null
          vat_amount: number | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string | null
          currency?: string | null
          date: string
          description: string
          expense_report_id: string
          id?: string
          receipt_url?: string | null
          sort_order?: number | null
          vat_amount?: number | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string | null
          currency?: string | null
          date?: string
          description?: string
          expense_report_id?: string
          id?: string
          receipt_url?: string | null
          sort_order?: number | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_items_expense_report_id_fkey"
            columns: ["expense_report_id"]
            isOneToOne: false
            referencedRelation: "expense_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          currency: string | null
          department_id: string | null
          id: string
          notes: string | null
          organization_id: string
          project_id: string | null
          rejection_reason: string | null
          report_date: string
          status: string | null
          title: string
          total_amount: number | null
          trip_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          department_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          project_id?: string | null
          rejection_reason?: string | null
          report_date?: string
          status?: string | null
          title: string
          total_amount?: number | null
          trip_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          department_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          project_id?: string | null
          rejection_reason?: string | null
          report_date?: string
          status?: string | null
          title?: string
          total_amount?: number | null
          trip_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_reports_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          api_key: string | null
          api_key_2: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          organization_id: string
          settings: Json | null
          type: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_key_2?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          organization_id: string
          settings?: Json | null
          type: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_key_2?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          organization_id?: string
          settings?: Json | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          account_id: string | null
          description: string
          id: string
          invoice_id: string
          line_total: number | null
          quantity: number | null
          sort_order: number | null
          unit_price: number | null
          vat_amount: number | null
          vat_code_id: string | null
          vat_rate: number | null
        }
        Insert: {
          account_id?: string | null
          description: string
          id?: string
          invoice_id: string
          line_total?: number | null
          quantity?: number | null
          sort_order?: number | null
          unit_price?: number | null
          vat_amount?: number | null
          vat_code_id?: string | null
          vat_rate?: number | null
        }
        Update: {
          account_id?: string | null
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number | null
          quantity?: number | null
          sort_order?: number | null
          unit_price?: number | null
          vat_amount?: number | null
          vat_code_id?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_vat_code_id_fkey"
            columns: ["vat_code_id"]
            isOneToOne: false
            referencedRelation: "vat_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          account_id: string | null
          ai_confidence: number | null
          ai_data: Json | null
          ai_scanned: boolean | null
          amount_excl_vat: number | null
          amount_incl_vat: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          department_id: string | null
          due_date: string | null
          file_name: string | null
          file_size_bytes: number | null
          file_type: string | null
          file_url: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          organization_id: string
          project_id: string | null
          purchase_order_id: string | null
          rejection_reason: string | null
          status: string | null
          supplier_id: string | null
          updated_at: string | null
          vat_amount: number | null
          vat_code_id: string | null
        }
        Insert: {
          account_id?: string | null
          ai_confidence?: number | null
          ai_data?: Json | null
          ai_scanned?: boolean | null
          amount_excl_vat?: number | null
          amount_incl_vat?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          department_id?: string | null
          due_date?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          organization_id: string
          project_id?: string | null
          purchase_order_id?: string | null
          rejection_reason?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_code_id?: string | null
        }
        Update: {
          account_id?: string | null
          ai_confidence?: number | null
          ai_data?: Json | null
          ai_scanned?: boolean | null
          amount_excl_vat?: number | null
          amount_incl_vat?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          department_id?: string | null
          due_date?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          organization_id?: string
          project_id?: string | null
          purchase_order_id?: string | null
          rejection_reason?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_code_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vat_code_id_fkey"
            columns: ["vat_code_id"]
            isOneToOne: false
            referencedRelation: "vat_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          invited_email: string | null
          joined_at: string | null
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          joined_at?: string | null
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          base_currency: string | null
          city: string | null
          country: string | null
          created_at: string | null
          cvr: string | null
          email: string | null
          fiscal_year_start: string | null
          id: string
          invoice_count_month: number | null
          logo_url: string | null
          name: string
          phone: string | null
          plan: string | null
          plan_expires_at: string | null
          postal_code: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          base_currency?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          cvr?: string | null
          email?: string | null
          fiscal_year_start?: string | null
          id?: string
          invoice_count_month?: number | null
          logo_url?: string | null
          name: string
          phone?: string | null
          plan?: string | null
          plan_expires_at?: string | null
          postal_code?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          base_currency?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          cvr?: string | null
          email?: string | null
          fiscal_year_start?: string | null
          id?: string
          invoice_count_month?: number | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan?: string | null
          plan_expires_at?: string | null
          postal_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string
          payment_date: string | null
          payment_method: string | null
          reference: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id: string
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          manager_email: string | null
          name: string
          organization_id: string
          status: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          manager_email?: string | null
          name: string
          organization_id: string
          status?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          manager_email?: string | null
          name?: string
          organization_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          account_id: string | null
          description: string
          id: string
          line_total: number | null
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          sort_order: number | null
          unit_price: number
          vat_code_id: string | null
        }
        Insert: {
          account_id?: string | null
          description: string
          id?: string
          line_total?: number | null
          purchase_order_id: string
          quantity?: number
          received_quantity?: number | null
          sort_order?: number | null
          unit_price?: number
          vat_code_id?: string | null
        }
        Update: {
          account_id?: string | null
          description?: string
          id?: string
          line_total?: number | null
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          sort_order?: number | null
          unit_price?: number
          vat_code_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_vat_code_id_fkey"
            columns: ["vat_code_id"]
            isOneToOne: false
            referencedRelation: "vat_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          department_id: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          order_date: string
          organization_id: string
          po_number: string
          project_id: string | null
          status: string | null
          supplier_id: string | null
          title: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          department_id?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          organization_id: string
          po_number: string
          project_id?: string | null
          status?: string | null
          supplier_id?: string | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          department_id?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          organization_id?: string
          po_number?: string
          project_id?: string | null
          status?: string | null
          supplier_id?: string | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account_no: string | null
          bank_reg_no: string | null
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          cvr: string | null
          default_account_code: string | null
          default_vat_code: string | null
          email: string | null
          iban: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          payment_terms: number | null
          phone: string | null
          postal_code: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bank_account_no?: string | null
          bank_reg_no?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          cvr?: string | null
          default_account_code?: string | null
          default_vat_code?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bank_account_no?: string | null
          bank_reg_no?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          cvr?: string | null
          default_account_code?: string | null
          default_vat_code?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          organization_id: string | null
          rate: number | null
          rate_type: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          organization_id?: string | null
          rate?: number | null
          rate_type?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          organization_id?: string | null
          rate?: number | null
          rate_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vat_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_admin_org_ids: { Args: Record<PropertyKey, never>; Returns: string[] }
      get_my_org_ids: { Args: Record<PropertyKey, never>; Returns: string[] }
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
