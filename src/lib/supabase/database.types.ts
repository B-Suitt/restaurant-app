
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "categories": {
                  Row: {
                    "active": boolean,"description": string | null,"id": string,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"description"?: string | null,"id"?: string,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"description"?: string | null,"id"?: string,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"dish_extras": {
                  Row: {
                    "active": boolean,"dish_id": string,"id": string,"name": string,"price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"dish_id": string,"id"?: string,"name": string,"price"?: number
                  }
                  Update: {
                    "active"?: boolean,"dish_id"?: string,"id"?: string,"name"?: string,"price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "dish_extras_dish_id_fkey"
      columns: ["dish_id"]
isOneToOne: false
      referencedRelation: "dishes"
      referencedColumns: ["id"]
    }
                  ]
                },"dishes": {
                  Row: {
                    "available": boolean,"category_id": string,"description": string | null,"featured": boolean,"id": string,"name": string,"photo_url": string | null,"price": number,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "available"?: boolean,"category_id": string,"description"?: string | null,"featured"?: boolean,"id"?: string,"name": string,"photo_url"?: string | null,"price": number,"sort_order"?: number
                  }
                  Update: {
                    "available"?: boolean,"category_id"?: string,"description"?: string | null,"featured"?: boolean,"id"?: string,"name"?: string,"photo_url"?: string | null,"price"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "dishes_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"order_item_events": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"id": string,"order_item_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: string,"order_item_id": string,"status": string
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: string,"order_item_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_item_events_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_item_events_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    }
                  ]
                },"order_item_extras": {
                  Row: {
                    "extra_id": string,"id": string,"order_item_id": string,"price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "extra_id": string,"id"?: string,"order_item_id": string,"price": number
                  }
                  Update: {
                    "extra_id"?: string,"id"?: string,"order_item_id"?: string,"price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_item_extras_extra_id_fkey"
      columns: ["extra_id"]
isOneToOne: false
      referencedRelation: "dish_extras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_item_extras_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "dish_id": string,"id": string,"note": string | null,"order_id": string,"quantity": number,"status": string,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "dish_id": string,"id"?: string,"note"?: string | null,"order_id": string,"quantity": number,"status"?: string,"unit_price": number
                  }
                  Update: {
                    "dish_id"?: string,"id"?: string,"note"?: string | null,"order_id"?: string,"quantity"?: number,"status"?: string,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_dish_id_fkey"
      columns: ["dish_id"]
isOneToOne: false
      referencedRelation: "dishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"number": number,"session_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"number"?: never,"session_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"number"?: never,"session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "table_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"created_at": string,"email": string,"id": string,"name": string,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"email": string,"id": string,"name": string,"role": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"email"?: string,"id"?: string,"name"?: string,"role"?: string
                  }
                  Relationships: [
                    
                  ]
                },"session_guests": {
                  Row: {
                    "joined_at": string,"session_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"session_id": string,"user_id": string
                  }
                  Update: {
                    "joined_at"?: string,"session_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_guests_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "table_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"table_sessions": {
                  Row: {
                    "closed_at": string | null,"closed_by": string | null,"confirmed_at": string | null,"confirmed_by": string | null,"id": string,"opened_at": string,"status": string,"table_id": string,"unpaid": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"id"?: string,"opened_at"?: string,"status"?: string,"table_id": string,"unpaid"?: boolean
                  }
                  Update: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"id"?: string,"opened_at"?: string,"status"?: string,"table_id"?: string,"unpaid"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "table_sessions_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "table_sessions_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "table_sessions_table_id_fkey"
      columns: ["table_id"]
isOneToOne: false
      referencedRelation: "tables"
      referencedColumns: ["id"]
    }
                  ]
                },"tables": {
                  Row: {
                    "active": boolean,"capacity": number,"created_at": string,"id": string,"number": number,"qr_token": string,"zone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"capacity": number,"created_at"?: string,"id"?: string,"number": number,"qr_token"?: string,"zone"?: string
                  }
                  Update: {
                    "active"?: boolean,"capacity"?: number,"created_at"?: string,"id"?: string,"number"?: number,"qr_token"?: string,"zone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"waiter_calls": {
                  Row: {
                    "attended_at": string | null,"attended_by": string | null,"created_at": string,"id": string,"session_id": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attended_at"?: string | null,"attended_by"?: string | null,"created_at"?: string,"id"?: string,"session_id": string,"type": string
                  }
                  Update: {
                    "attended_at"?: string | null,"attended_by"?: string | null,"created_at"?: string,"id"?: string,"session_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "waiter_calls_attended_by_fkey"
      columns: ["attended_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "waiter_calls_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "table_sessions"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "attend_call":
{ Args: { "p_call_id": string }; Returns: undefined
                           },
"call_waiter":
{ Args: { "p_session_id": string,"p_type": string }; Returns: string
                           },
"close_session":
{ Args: { "p_session_id": string,"p_unpaid"?: boolean }; Returns: undefined
                           },
"confirm_session":
{ Args: { "p_session_id": string }; Returns: undefined
                           },
"join_table":
{ Args: { "p_qr_token": string }; Returns: string
                           },
"open_table":
{ Args: { "p_table_id": string }; Returns: string
                           },
"place_order":
{ Args: { "p_items": Json,"p_order_id"?: string,"p_session_id": string }; Returns: string
                           },
"set_item_status":
{ Args: { "p_item_id": string,"p_status": string }; Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
