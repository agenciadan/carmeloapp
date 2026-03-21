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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      configuracoes: {
        Row: {
          anthropic_model: string
          app_em_manutencao: boolean
          atualizado_em: string
          id: number
          max_tokens: number
          mensagem_manutencao: string | null
        }
        Insert: {
          anthropic_model?: string
          app_em_manutencao?: boolean
          atualizado_em?: string
          id?: number
          max_tokens?: number
          mensagem_manutencao?: string | null
        }
        Update: {
          anthropic_model?: string
          app_em_manutencao?: boolean
          atualizado_em?: string
          id?: number
          max_tokens?: number
          mensagem_manutencao?: string | null
        }
        Relationships: []
      }
      conquistas_usuario: {
        Row: {
          conquistado_em: string
          emoji: string
          id: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          conquistado_em?: string
          emoji: string
          id?: string
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          conquistado_em?: string
          emoji?: string
          id?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conquistas_usuario_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dias_leitura: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          dia_numero: number
          id: string
          plano_id: string
          referencia: string
          reflexao_ia: string
          titulo_passagem: string
          user_id: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          dia_numero: number
          id?: string
          plano_id: string
          referencia: string
          reflexao_ia: string
          titulo_passagem: string
          user_id: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          dia_numero?: number
          id?: string
          plano_id?: string
          referencia?: string
          reflexao_ia?: string
          titulo_passagem?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dias_leitura_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_leitura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dias_leitura_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      historico: {
        Row: {
          criado_em: string
          dados_completos: Json | null
          data_formatada: string | null
          id: string
          referencia: string | null
          texto_preview: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          dados_completos?: Json | null
          data_formatada?: string | null
          id?: string
          referencia?: string | null
          texto_preview?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          criado_em?: string
          dados_completos?: Json | null
          data_formatada?: string | null
          id?: string
          referencia?: string | null
          texto_preview?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_leitura: {
        Row: {
          compartilhado: boolean
          descricao: string
          gerado_em: string
          id: string
          proximo_plano_em: string | null
          status: string
          titulo: string
          total_dias: number
          user_id: string
        }
        Insert: {
          compartilhado?: boolean
          descricao: string
          gerado_em?: string
          id?: string
          proximo_plano_em?: string | null
          status?: string
          titulo: string
          total_dias: number
          user_id: string
        }
        Update: {
          compartilhado?: boolean
          descricao?: string
          gerado_em?: string
          id?: string
          proximo_plano_em?: string | null
          status?: string
          titulo?: string
          total_dias?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_leitura_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts_comunidade: {
        Row: {
          conteudo: string
          criado_em: string
          id: string
          nome_usuario: string
          referencia_biblica: string | null
          tipo: string
          user_id: string
          visivel: boolean
        }
        Insert: {
          conteudo: string
          criado_em?: string
          id?: string
          nome_usuario: string
          referencia_biblica?: string | null
          tipo: string
          user_id: string
          visivel?: boolean
        }
        Update: {
          conteudo?: string
          criado_em?: string
          id?: string
          nome_usuario?: string
          referencia_biblica?: string | null
          tipo?: string
          user_id?: string
          visivel?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "posts_comunidade_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          criado_em: string
          email: string | null
          id: string
          igreja: string | null
          nome: string | null
          role: string
          ultimo_acesso: string | null
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          criado_em?: string
          email?: string | null
          id: string
          igreja?: string | null
          nome?: string | null
          role?: string
          ultimo_acesso?: string | null
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          igreja?: string | null
          nome?: string | null
          role?: string
          ultimo_acesso?: string | null
        }
        Relationships: []
      }
      reacoes_posts: {
        Row: {
          criado_em: string
          id: string
          post_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          post_id: string
          tipo: string
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          post_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reacoes_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_comunidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reacoes_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
