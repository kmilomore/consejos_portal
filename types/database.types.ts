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
      actas: {
        Row: {
          acuerdos: string
          asistentes: Json
          comuna: string
          created_at: string
          desarrollo: string
          direccion: string
          fecha: string
          formato: Database["public"]["Enums"]["session_format"]
          hora_inicio: string | null
          hora_termino: string | null
          id: string
          link_acta: string | null
          lugar: string
          modo_registro: string
          observacion_documental: string
          programacion_origen_id: string | null
          proxima_sesion: string | null
          rbd: string
          sesion: number
          tabla_temas: string
          tipo_sesion: Database["public"]["Enums"]["session_type"]
          updated_at: string
          varios: string
        }
        Insert: {
          acuerdos: string
          asistentes?: Json
          comuna: string
          created_at?: string
          desarrollo: string
          direccion: string
          fecha: string
          formato: Database["public"]["Enums"]["session_format"]
          hora_inicio?: string | null
          hora_termino?: string | null
          id?: string
          link_acta?: string | null
          lugar: string
          modo_registro?: string
          observacion_documental?: string
          programacion_origen_id?: string | null
          proxima_sesion?: string | null
          rbd: string
          sesion: number
          tabla_temas: string
          tipo_sesion: Database["public"]["Enums"]["session_type"]
          updated_at?: string
          varios: string
        }
        Update: {
          acuerdos?: string
          asistentes?: Json
          comuna?: string
          created_at?: string
          desarrollo?: string
          direccion?: string
          fecha?: string
          formato?: Database["public"]["Enums"]["session_format"]
          hora_inicio?: string | null
          hora_termino?: string | null
          id?: string
          link_acta?: string | null
          lugar?: string
          modo_registro?: string
          observacion_documental?: string
          programacion_origen_id?: string | null
          proxima_sesion?: string | null
          rbd?: string
          sesion?: number
          tabla_temas?: string
          tipo_sesion?: Database["public"]["Enums"]["session_type"]
          updated_at?: string
          varios?: string
        }
        Relationships: [
          {
            foreignKeyName: "actas_programacion_origen_id_fkey"
            columns: ["programacion_origen_id"]
            isOneToOne: false
            referencedRelation: "programacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actas_rbd_fkey"
            columns: ["rbd"]
            isOneToOne: false
            referencedRelation: "establecimientos"
            referencedColumns: ["rbd"]
          },
        ]
      }
      actas_inteligencia: {
        Row: {
          acta_id: string
          actores_clave: string[] | null
          actualizado_en: string | null
          acuerdos_extraidos: string[] | null
          acuerdos_original: string | null
          comuna: string | null
          coordinadores: string[] | null
          dolor_principal: string | null
          dolores_ia: string[]
          fecha: string | null
          foco_real: string | null
          informe_original: string | null
          nombre_establecimiento: string | null
          procesado_en: string | null
          rbd: number | null
          requiere_escalada: boolean | null
          resumen_ia: string | null
          score_riesgo: number | null
          tematica_original: string | null
          tematicas_ia: string[] | null
          tipo_reunion_original: string | null
          tono: string | null
          urgencia: string | null
        }
        Insert: {
          acta_id: string
          actores_clave?: string[] | null
          actualizado_en?: string | null
          acuerdos_extraidos?: string[] | null
          acuerdos_original?: string | null
          comuna?: string | null
          coordinadores?: string[] | null
          dolor_principal?: string | null
          dolores_ia?: string[]
          fecha?: string | null
          foco_real?: string | null
          informe_original?: string | null
          nombre_establecimiento?: string | null
          procesado_en?: string | null
          rbd?: number | null
          requiere_escalada?: boolean | null
          resumen_ia?: string | null
          score_riesgo?: number | null
          tematica_original?: string | null
          tematicas_ia?: string[] | null
          tipo_reunion_original?: string | null
          tono?: string | null
          urgencia?: string | null
        }
        Update: {
          acta_id?: string
          actores_clave?: string[] | null
          actualizado_en?: string | null
          acuerdos_extraidos?: string[] | null
          acuerdos_original?: string | null
          comuna?: string | null
          coordinadores?: string[] | null
          dolor_principal?: string | null
          dolores_ia?: string[]
          fecha?: string | null
          foco_real?: string | null
          informe_original?: string | null
          nombre_establecimiento?: string | null
          procesado_en?: string | null
          rbd?: number | null
          requiere_escalada?: boolean | null
          resumen_ia?: string | null
          score_riesgo?: number | null
          tematica_original?: string | null
          tematicas_ia?: string[] | null
          tipo_reunion_original?: string | null
          tono?: string | null
          urgencia?: string | null
        }
        Relationships: []
      }
      actas_invitados: {
        Row: {
          acta_id: string
          cargo: string
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          acta_id: string
          cargo: string
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          acta_id?: string
          cargo?: string
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "actas_invitados_acta_id_fkey"
            columns: ["acta_id"]
            isOneToOne: false
            referencedRelation: "actas"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_comp_time_balances: {
        Row: {
          created_at: string
          email: string
          horas_disponibles: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          horas_disponibles?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          horas_disponibles?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_comp_time_loads: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          horas: number
          id: string
          mes: string
          nota: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          horas: number
          id?: string
          mes: string
          nota?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          horas?: number
          id?: string
          mes?: string
          nota?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_comp_time_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string
          end_date: string
          end_time: string
          generated_pdf_bucket: string | null
          generated_pdf_file_name: string | null
          generated_pdf_mime_type: string | null
          generated_pdf_path: string | null
          generated_pdf_public_url: string | null
          generated_pdf_size_bytes: number | null
          generated_pdf_uploaded_at: string | null
          hours_after: number
          hours_before: number
          id: string
          reason: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          request_date: string
          requested_hours: number
          start_date: string
          start_time: string
          status: string
          updated_at: string
          webhook_error: string | null
          webhook_response_code: number | null
          webhook_sent_at: string | null
          webhook_status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email: string
          end_date: string
          end_time: string
          generated_pdf_bucket?: string | null
          generated_pdf_file_name?: string | null
          generated_pdf_mime_type?: string | null
          generated_pdf_path?: string | null
          generated_pdf_public_url?: string | null
          generated_pdf_size_bytes?: number | null
          generated_pdf_uploaded_at?: string | null
          hours_after: number
          hours_before: number
          id?: string
          reason: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_date?: string
          requested_hours: number
          start_date: string
          start_time: string
          status?: string
          updated_at?: string
          webhook_error?: string | null
          webhook_response_code?: number | null
          webhook_sent_at?: string | null
          webhook_status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string
          end_date?: string
          end_time?: string
          generated_pdf_bucket?: string | null
          generated_pdf_file_name?: string | null
          generated_pdf_mime_type?: string | null
          generated_pdf_path?: string | null
          generated_pdf_public_url?: string | null
          generated_pdf_size_bytes?: number | null
          generated_pdf_uploaded_at?: string | null
          hours_after?: number
          hours_before?: number
          id?: string
          reason?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_date?: string
          requested_hours?: number
          start_date?: string
          start_time?: string
          status?: string
          updated_at?: string
          webhook_error?: string | null
          webhook_response_code?: number | null
          webhook_sent_at?: string | null
          webhook_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_comp_time_requests_email_fk"
            columns: ["email"]
            isOneToOne: false
            referencedRelation: "admin_comp_time_balances"
            referencedColumns: ["email"]
          },
        ]
      }
      admin_correos: {
        Row: {
          correo_electronico: string
          created_at: string
          nombre: string | null
        }
        Insert: {
          correo_electronico: string
          created_at?: string
          nombre?: string | null
        }
        Update: {
          correo_electronico?: string
          created_at?: string
          nombre?: string | null
        }
        Relationships: []
      }
      admin_user_roles: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          role: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email: string
          role: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      auth_auditoria: {
        Row: {
          accion: string
          detalle: string
          email: string
          id: number
          modulo: string
          timestamp: string
        }
        Insert: {
          accion: string
          detalle?: string
          email: string
          id?: number
          modulo: string
          timestamp?: string
        }
        Update: {
          accion?: string
          detalle?: string
          email?: string
          id?: number
          modulo?: string
          timestamp?: string
        }
        Relationships: []
      }
      auth_menu_overrides: {
        Row: {
          email: string
          menus: Json
          updated_at: string
        }
        Insert: {
          email: string
          menus?: Json
          updated_at?: string
        }
        Update: {
          email?: string
          menus?: Json
          updated_at?: string
        }
        Relationships: []
      }
      auth_role_access: {
        Row: {
          menus: Json
          rol: string
          updated_at: string
        }
        Insert: {
          menus?: Json
          rol: string
          updated_at?: string
        }
        Update: {
          menus?: Json
          rol?: string
          updated_at?: string
        }
        Relationships: []
      }
      auth_users_roles: {
        Row: {
          activo: boolean
          email: string
          nombre: string
          rol: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          email: string
          nombre: string
          rol: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          email?: string
          nombre?: string
          rol?: string
          updated_at?: string
        }
        Relationships: []
      }
      "BASE DE DATOS ESCUELAS SLEP": {
        Row: {
          ALTITUD: string | null
          "ASESOR UATP": string | null
          CELULAR: string | null
          COMUNA: string | null
          COMUNA_1: string | null
          CORREO: string | null
          "CORREO ASESOR": string | null
          "CORREO ELECTRÓNICO": string | null
          "CORREO REPRESENTANTE": string | null
          "CORREO SUBROGANTE": string | null
          DIRECCIÓN: string | null
          "DIRECTOR/A": string | null
          "FUNCIONARIO SUBROGANTE POR LM": string | null
          LATITUD: string | null
          LONGITUD: string | null
          "N°": number | null
          "NOMBRE ESTABLECIMIENTO": string | null
          "NOMBRE PRESIDENTE CGPMA": string | null
          "OBSERVACION CGPMA": string | null
          OBSERVACIONES: string | null
          RBD: string | null
          "REPRESENTANTE CONSEJO ESCOLAR": string | null
          "RURAL/URBANO": string | null
          RUT: string | null
          TELEFONO: number | null
          "TELEFONO CELULAR": string | null
          "TELEFONO FIJO/ANEXOS": string | null
          TIPO: string | null
        }
        Insert: {
          ALTITUD?: string | null
          "ASESOR UATP"?: string | null
          CELULAR?: string | null
          COMUNA?: string | null
          COMUNA_1?: string | null
          CORREO?: string | null
          "CORREO ASESOR"?: string | null
          "CORREO ELECTRÓNICO"?: string | null
          "CORREO REPRESENTANTE"?: string | null
          "CORREO SUBROGANTE"?: string | null
          DIRECCIÓN?: string | null
          "DIRECTOR/A"?: string | null
          "FUNCIONARIO SUBROGANTE POR LM"?: string | null
          LATITUD?: string | null
          LONGITUD?: string | null
          "N°"?: number | null
          "NOMBRE ESTABLECIMIENTO"?: string | null
          "NOMBRE PRESIDENTE CGPMA"?: string | null
          "OBSERVACION CGPMA"?: string | null
          OBSERVACIONES?: string | null
          RBD?: string | null
          "REPRESENTANTE CONSEJO ESCOLAR"?: string | null
          "RURAL/URBANO"?: string | null
          RUT?: string | null
          TELEFONO?: number | null
          "TELEFONO CELULAR"?: string | null
          "TELEFONO FIJO/ANEXOS"?: string | null
          TIPO?: string | null
        }
        Update: {
          ALTITUD?: string | null
          "ASESOR UATP"?: string | null
          CELULAR?: string | null
          COMUNA?: string | null
          COMUNA_1?: string | null
          CORREO?: string | null
          "CORREO ASESOR"?: string | null
          "CORREO ELECTRÓNICO"?: string | null
          "CORREO REPRESENTANTE"?: string | null
          "CORREO SUBROGANTE"?: string | null
          DIRECCIÓN?: string | null
          "DIRECTOR/A"?: string | null
          "FUNCIONARIO SUBROGANTE POR LM"?: string | null
          LATITUD?: string | null
          LONGITUD?: string | null
          "N°"?: number | null
          "NOMBRE ESTABLECIMIENTO"?: string | null
          "NOMBRE PRESIDENTE CGPMA"?: string | null
          "OBSERVACION CGPMA"?: string | null
          OBSERVACIONES?: string | null
          RBD?: string | null
          "REPRESENTANTE CONSEJO ESCOLAR"?: string | null
          "RURAL/URBANO"?: string | null
          RUT?: string | null
          TELEFONO?: number | null
          "TELEFONO CELULAR"?: string | null
          "TELEFONO FIJO/ANEXOS"?: string | null
          TIPO?: string | null
        }
        Relationships: []
      }
      base_establecimiento_cargos: {
        Row: {
          activo: boolean
          asesor_pedagogico: string
          cargo: string
          celular: string
          coordinador_territorial: string
          created_at: string
          email: string
          establecimiento_rbd: string
          establecimiento_rrbd: string
          fuente: string
          id: string
          nombres: string
          rbd_norm: string
          rrbd_norm: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          asesor_pedagogico?: string
          cargo?: string
          celular?: string
          coordinador_territorial?: string
          created_at?: string
          email?: string
          establecimiento_rbd?: string
          establecimiento_rrbd?: string
          fuente?: string
          id?: string
          nombres?: string
          rbd_norm?: string
          rrbd_norm?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          asesor_pedagogico?: string
          cargo?: string
          celular?: string
          coordinador_territorial?: string
          created_at?: string
          email?: string
          establecimiento_rbd?: string
          establecimiento_rrbd?: string
          fuente?: string
          id?: string
          nombres?: string
          rbd_norm?: string
          rrbd_norm?: string
          updated_at?: string
        }
        Relationships: []
      }
      ce_constitucion: {
        Row: {
          activo: boolean
          anio_constitucion: string
          creado_por: string
          created_at: string
          docente_asesor_correo: string | null
          docente_asesor_nombre: string | null
          docente_asesor_telefono: string | null
          establecimiento: string
          id: string
          presidente_correo: string | null
          presidente_nombre: string | null
          presidente_telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          anio_constitucion: string
          creado_por: string
          created_at?: string
          docente_asesor_correo?: string | null
          docente_asesor_nombre?: string | null
          docente_asesor_telefono?: string | null
          establecimiento: string
          id?: string
          presidente_correo?: string | null
          presidente_nombre?: string | null
          presidente_telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          anio_constitucion?: string
          creado_por?: string
          created_at?: string
          docente_asesor_correo?: string | null
          docente_asesor_nombre?: string | null
          docente_asesor_telefono?: string | null
          establecimiento?: string
          id?: string
          presidente_correo?: string | null
          presidente_nombre?: string | null
          presidente_telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ce_integrantes: {
        Row: {
          anio_constitucion: string | null
          creado_por: string
          created_at: string
          curso: string
          docente_asesor_correo: string | null
          docente_asesor_nombre: string | null
          docente_asesor_telefono: string | null
          establecimiento: string
          estado: string
          id: string
          nombre_completo: string
          presidente_correo: string | null
          presidente_telefono: string | null
          rut: string | null
          updated_at: string
        }
        Insert: {
          anio_constitucion?: string | null
          creado_por: string
          created_at?: string
          curso: string
          docente_asesor_correo?: string | null
          docente_asesor_nombre?: string | null
          docente_asesor_telefono?: string | null
          establecimiento: string
          estado?: string
          id?: string
          nombre_completo: string
          presidente_correo?: string | null
          presidente_telefono?: string | null
          rut?: string | null
          updated_at?: string
        }
        Update: {
          anio_constitucion?: string | null
          creado_por?: string
          created_at?: string
          curso?: string
          docente_asesor_correo?: string | null
          docente_asesor_nombre?: string | null
          docente_asesor_telefono?: string | null
          establecimiento?: string
          estado?: string
          id?: string
          nombre_completo?: string
          presidente_correo?: string | null
          presidente_telefono?: string | null
          rut?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      encargados_beneficios: {
        Row: {
          area: string | null
          comuna: string | null
          correo_funcionario: string | null
          created_at: string | null
          id: number
          nombre_completo_funcionario: string | null
          nombre_establecimiento: string | null
          rbd: string | null
          telefono: string | null
        }
        Insert: {
          area?: string | null
          comuna?: string | null
          correo_funcionario?: string | null
          created_at?: string | null
          id?: number
          nombre_completo_funcionario?: string | null
          nombre_establecimiento?: string | null
          rbd?: string | null
          telefono?: string | null
        }
        Update: {
          area?: string | null
          comuna?: string | null
          correo_funcionario?: string | null
          created_at?: string | null
          id?: number
          nombre_completo_funcionario?: string | null
          nombre_establecimiento?: string | null
          rbd?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      establecimientos: {
        Row: {
          comuna: string
          created_at: string
          direccion: string
          nombre: string
          rbd: string
          updated_at: string
        }
        Insert: {
          comuna: string
          created_at?: string
          direccion: string
          nombre: string
          rbd: string
          updated_at?: string
        }
        Update: {
          comuna?: string
          created_at?: string
          direccion?: string
          nombre?: string
          rbd?: string
          updated_at?: string
        }
        Relationships: []
      }
      establecimientos_accesos: {
        Row: {
          activo: boolean
          comuna: string | null
          created_at: string
          descripcion: string | null
          email_normalizado: string
          id: number
          rbd: string | null
          scope_kind: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          comuna?: string | null
          created_at?: string
          descripcion?: string | null
          email_normalizado: string
          id?: number
          rbd?: string | null
          scope_kind?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          comuna?: string | null
          created_at?: string
          descripcion?: string | null
          email_normalizado?: string
          id?: number
          rbd?: string | null
          scope_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "establecimientos_accesos_rbd_fkey"
            columns: ["rbd"]
            isOneToOne: false
            referencedRelation: "establecimientos"
            referencedColumns: ["rbd"]
          },
        ]
      }
      EVENTOS: {
        Row: {
          "ACTA DE EVENTO": string | null
          ACTUALIZADO_EN: string | null
          "BREVE DESCRIPCIÓN DEL EVENTO": string | null
          "CARGO RESPONSABLE": string | null
          "CATEGORIA DEL EVENTO": string | null
          COMUNA: string | null
          "CORREO PARA ENVIO DE ACTA": string | null
          CREADO_EN: string | null
          CREADO_POR: string | null
          "E.E": string | null
          "ESTABLECIMIENTO EDUCACIONAL": string | null
          "ESTAMENTOS PARTICIPANTES": string | null
          "FECHA DEL EVENTO": string | null
          "FECHA EVENTO": string | null
          "FOTO 2": string | null
          "FOTO 3": string | null
          FOTOGRAFIAS: string | null
          "HASH VALIDACION": string | null
          ID: string
          "INFORME DEL EVENTO": string | null
          "LISTA DE ASISTENCIA": string | null
          LUGAR: string | null
          MAKE: string | null
          "Marca temporal": string | null
          MODALIDAD: string | null
          "Nº DE APODERADOS": string | null
          "Nº DE PARTICIPANTES ESTUDIANTES": string | null
          "Nº DE PARTICIPANTES FUNCIONARIOS": number | null
          "NOMBRE DEL EVENTO": string | null
          "PARTICIPARON PARTICULARES": string | null
          "PLAN ASOCIADO": string | null
          RESPONSABLE: string | null
          "TIPO DE EVENTO": string | null
          "TIPO EVENTO": string | null
          "URL VALIDACION": string | null
        }
        Insert: {
          "ACTA DE EVENTO"?: string | null
          ACTUALIZADO_EN?: string | null
          "BREVE DESCRIPCIÓN DEL EVENTO"?: string | null
          "CARGO RESPONSABLE"?: string | null
          "CATEGORIA DEL EVENTO"?: string | null
          COMUNA?: string | null
          "CORREO PARA ENVIO DE ACTA"?: string | null
          CREADO_EN?: string | null
          CREADO_POR?: string | null
          "E.E"?: string | null
          "ESTABLECIMIENTO EDUCACIONAL"?: string | null
          "ESTAMENTOS PARTICIPANTES"?: string | null
          "FECHA DEL EVENTO"?: string | null
          "FECHA EVENTO"?: string | null
          "FOTO 2"?: string | null
          "FOTO 3"?: string | null
          FOTOGRAFIAS?: string | null
          "HASH VALIDACION"?: string | null
          ID: string
          "INFORME DEL EVENTO"?: string | null
          "LISTA DE ASISTENCIA"?: string | null
          LUGAR?: string | null
          MAKE?: string | null
          "Marca temporal"?: string | null
          MODALIDAD?: string | null
          "Nº DE APODERADOS"?: string | null
          "Nº DE PARTICIPANTES ESTUDIANTES"?: string | null
          "Nº DE PARTICIPANTES FUNCIONARIOS"?: number | null
          "NOMBRE DEL EVENTO"?: string | null
          "PARTICIPARON PARTICULARES"?: string | null
          "PLAN ASOCIADO"?: string | null
          RESPONSABLE?: string | null
          "TIPO DE EVENTO"?: string | null
          "TIPO EVENTO"?: string | null
          "URL VALIDACION"?: string | null
        }
        Update: {
          "ACTA DE EVENTO"?: string | null
          ACTUALIZADO_EN?: string | null
          "BREVE DESCRIPCIÓN DEL EVENTO"?: string | null
          "CARGO RESPONSABLE"?: string | null
          "CATEGORIA DEL EVENTO"?: string | null
          COMUNA?: string | null
          "CORREO PARA ENVIO DE ACTA"?: string | null
          CREADO_EN?: string | null
          CREADO_POR?: string | null
          "E.E"?: string | null
          "ESTABLECIMIENTO EDUCACIONAL"?: string | null
          "ESTAMENTOS PARTICIPANTES"?: string | null
          "FECHA DEL EVENTO"?: string | null
          "FECHA EVENTO"?: string | null
          "FOTO 2"?: string | null
          "FOTO 3"?: string | null
          FOTOGRAFIAS?: string | null
          "HASH VALIDACION"?: string | null
          ID?: string
          "INFORME DEL EVENTO"?: string | null
          "LISTA DE ASISTENCIA"?: string | null
          LUGAR?: string | null
          MAKE?: string | null
          "Marca temporal"?: string | null
          MODALIDAD?: string | null
          "Nº DE APODERADOS"?: string | null
          "Nº DE PARTICIPANTES ESTUDIANTES"?: string | null
          "Nº DE PARTICIPANTES FUNCIONARIOS"?: number | null
          "NOMBRE DEL EVENTO"?: string | null
          "PARTICIPARON PARTICULARES"?: string | null
          "PLAN ASOCIADO"?: string | null
          RESPONSABLE?: string | null
          "TIPO DE EVENTO"?: string | null
          "TIPO EVENTO"?: string | null
          "URL VALIDACION"?: string | null
        }
        Relationships: []
      }
      gmail_metrics_cache: {
        Row: {
          cantidad_enviados: number
          created_at: string
          es_externo: boolean
          fecha: string
          hora: number
          id: string
          updated_at: string
          user_email: string
        }
        Insert: {
          cantidad_enviados?: number
          created_at?: string
          es_externo: boolean
          fecha: string
          hora: number
          id?: string
          updated_at?: string
          user_email: string
        }
        Update: {
          cantidad_enviados?: number
          created_at?: string
          es_externo?: boolean
          fecha?: string
          hora?: number
          id?: string
          updated_at?: string
          user_email?: string
        }
        Relationships: []
      }
      it_score_overrides: {
        Row: {
          ajustado_en: string | null
          ajustado_por: string | null
          motivo: string | null
          rbd: number
          score_manual: number
        }
        Insert: {
          ajustado_en?: string | null
          ajustado_por?: string | null
          motivo?: string | null
          rbd: number
          score_manual: number
        }
        Update: {
          ajustado_en?: string | null
          ajustado_por?: string | null
          motivo?: string | null
          rbd?: number
          score_manual?: number
        }
        Relationships: []
      }
      logs: {
        Row: {
          accion: Database["public"]["Enums"]["log_action"]
          created_at: string
          detalle: string
          id: string
          rbd: string
          usuario: string
          vista_origen: string
        }
        Insert: {
          accion: Database["public"]["Enums"]["log_action"]
          created_at?: string
          detalle: string
          id?: string
          rbd: string
          usuario: string
          vista_origen: string
        }
        Update: {
          accion?: Database["public"]["Enums"]["log_action"]
          created_at?: string
          detalle?: string
          id?: string
          rbd?: string
          usuario?: string
          vista_origen?: string
        }
        Relationships: []
      }
      matricula_mensual: {
        Row: {
          anio: number
          asist_prom: number | null
          comuna: string | null
          created_at: string | null
          curso: string | null
          dias_trab: number | null
          hab_subv: boolean | null
          id: number
          letra: string | null
          mat_final: number
          mes: string
          nivel: string | null
          pct_asist: number | null
          rbd: string
          rbd_norm: string
          tipo_ens: string | null
        }
        Insert: {
          anio?: number
          asist_prom?: number | null
          comuna?: string | null
          created_at?: string | null
          curso?: string | null
          dias_trab?: number | null
          hab_subv?: boolean | null
          id?: never
          letra?: string | null
          mat_final?: number
          mes: string
          nivel?: string | null
          pct_asist?: number | null
          rbd: string
          rbd_norm: string
          tipo_ens?: string | null
        }
        Update: {
          anio?: number
          asist_prom?: number | null
          comuna?: string | null
          created_at?: string | null
          curso?: string | null
          dias_trab?: number | null
          hab_subv?: boolean | null
          id?: never
          letra?: string | null
          mat_final?: number
          mes?: string
          nivel?: string | null
          pct_asist?: number | null
          rbd?: string
          rbd_norm?: string
          tipo_ens?: string | null
        }
        Relationships: []
      }
      pesquisa_seguimiento: {
        Row: {
          columna: number | null
          created_at: string
          created_by: string | null
          estado: string
          id: string
          observaciones: string | null
          oftalmologia: number | null
          otorrino: number | null
          rbd: string
          seguimiento: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          columna?: number | null
          created_at?: string
          created_by?: string | null
          estado?: string
          id?: string
          observaciones?: string | null
          oftalmologia?: number | null
          otorrino?: number | null
          rbd: string
          seguimiento?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          columna?: number | null
          created_at?: string
          created_by?: string | null
          estado?: string
          id?: string
          observaciones?: string | null
          oftalmologia?: number | null
          otorrino?: number | null
          rbd?: string
          seguimiento?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      programacion: {
        Row: {
          acta_vinculada_id: string | null
          created_at: string
          estado: Database["public"]["Enums"]["planning_status"]
          fecha_programada: string
          formato_planeado: Database["public"]["Enums"]["session_format"]
          hora_programada: string
          id: string
          lugar_tentativo: string
          numero_sesion: number
          rbd: string
          tematicas: string
          tipo_sesion: Database["public"]["Enums"]["session_type"]
          updated_at: string
        }
        Insert: {
          acta_vinculada_id?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["planning_status"]
          fecha_programada: string
          formato_planeado: Database["public"]["Enums"]["session_format"]
          hora_programada: string
          id?: string
          lugar_tentativo: string
          numero_sesion: number
          rbd: string
          tematicas: string
          tipo_sesion: Database["public"]["Enums"]["session_type"]
          updated_at?: string
        }
        Update: {
          acta_vinculada_id?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["planning_status"]
          fecha_programada?: string
          formato_planeado?: Database["public"]["Enums"]["session_format"]
          hora_programada?: string
          id?: string
          lugar_tentativo?: string
          numero_sesion?: number
          rbd?: string
          tematicas?: string
          tipo_sesion?: Database["public"]["Enums"]["session_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programacion_acta_vinculada_fk"
            columns: ["acta_vinculada_id"]
            isOneToOne: false
            referencedRelation: "actas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programacion_rbd_fkey"
            columns: ["rbd"]
            isOneToOne: false
            referencedRelation: "establecimientos"
            referencedColumns: ["rbd"]
          },
        ]
      }
      rbd_diagnosticos_ia: {
        Row: {
          actas_analizadas: number | null
          actualizado_en: string | null
          compromisos_pendientes: string[] | null
          diagnostico_territorial: string | null
          patron_detectado: string | null
          probabilidad_escalada_30d: number | null
          procesado_en: string | null
          rbd: number
          recomendacion_ia: string | null
          temas_sin_resolver: string[] | null
        }
        Insert: {
          actas_analizadas?: number | null
          actualizado_en?: string | null
          compromisos_pendientes?: string[] | null
          diagnostico_territorial?: string | null
          patron_detectado?: string | null
          probabilidad_escalada_30d?: number | null
          procesado_en?: string | null
          rbd: number
          recomendacion_ia?: string | null
          temas_sin_resolver?: string[] | null
        }
        Update: {
          actas_analizadas?: number | null
          actualizado_en?: string | null
          compromisos_pendientes?: string[] | null
          diagnostico_territorial?: string | null
          patron_detectado?: string | null
          probabilidad_escalada_30d?: number | null
          procesado_en?: string | null
          rbd?: number
          recomendacion_ia?: string | null
          temas_sin_resolver?: string[] | null
        }
        Relationships: []
      }
      salidas_control_gestion: {
        Row: {
          adjunto_nombre: string | null
          adjunto_tipo: string | null
          adjunto_url: string | null
          autor: string
          autor_nombre: string | null
          comentario: string
          created_at: string
          id: string
          salida_id: string
        }
        Insert: {
          adjunto_nombre?: string | null
          adjunto_tipo?: string | null
          adjunto_url?: string | null
          autor: string
          autor_nombre?: string | null
          comentario?: string
          created_at?: string
          id?: string
          salida_id: string
        }
        Update: {
          adjunto_nombre?: string | null
          adjunto_tipo?: string | null
          adjunto_url?: string | null
          autor?: string
          autor_nombre?: string | null
          comentario?: string
          created_at?: string
          id?: string
          salida_id?: string
        }
        Relationships: []
      }
      tareas: {
        Row: {
          asignado_a: string | null
          asignados: string[] | null
          checklist: Json | null
          creado_por: string
          created_at: string
          descripcion: string | null
          estado: string
          etiquetas: string[] | null
          etiquetas_v2: Json | null
          fecha_limite: string | null
          id: string
          modulo: string | null
          prioridad: string
          rbd: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          asignado_a?: string | null
          asignados?: string[] | null
          checklist?: Json | null
          creado_por: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          etiquetas?: string[] | null
          etiquetas_v2?: Json | null
          fecha_limite?: string | null
          id?: string
          modulo?: string | null
          prioridad?: string
          rbd?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          asignado_a?: string | null
          asignados?: string[] | null
          checklist?: Json | null
          creado_por?: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          etiquetas?: string[] | null
          etiquetas_v2?: Json | null
          fecha_limite?: string | null
          id?: string
          modulo?: string | null
          prioridad?: string
          rbd?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      tareas_actas: {
        Row: {
          acta_establecimiento: string | null
          acta_fecha: string | null
          acta_id: string
          acta_tematicas: string | null
          acta_tipo: string | null
          created_at: string
          id: string
          tarea_id: string
          vinculado_por: string
        }
        Insert: {
          acta_establecimiento?: string | null
          acta_fecha?: string | null
          acta_id: string
          acta_tematicas?: string | null
          acta_tipo?: string | null
          created_at?: string
          id?: string
          tarea_id: string
          vinculado_por: string
        }
        Update: {
          acta_establecimiento?: string | null
          acta_fecha?: string | null
          acta_id?: string
          acta_tematicas?: string | null
          acta_tipo?: string | null
          created_at?: string
          id?: string
          tarea_id?: string
          vinculado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_actas_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_adjuntos: {
        Row: {
          created_at: string
          id: string
          nombre: string
          storage_path: string
          subido_por: string
          tamano: number | null
          tarea_id: string
          tipo_mime: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          storage_path: string
          subido_por: string
          tamano?: number | null
          tarea_id: string
          tipo_mime?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          storage_path?: string
          subido_por?: string
          tamano?: number | null
          tarea_id?: string
          tipo_mime?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_adjuntos_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_comentarios: {
        Row: {
          adjunto_nombre: string | null
          adjunto_tipo: string | null
          adjunto_url: string | null
          autor: string
          contenido: string
          created_at: string
          fijado: boolean
          fijado_at: string | null
          fijado_por: string | null
          id: string
          reacciones: Json | null
          tarea_id: string
        }
        Insert: {
          adjunto_nombre?: string | null
          adjunto_tipo?: string | null
          adjunto_url?: string | null
          autor: string
          contenido: string
          created_at?: string
          fijado?: boolean
          fijado_at?: string | null
          fijado_por?: string | null
          id?: string
          reacciones?: Json | null
          tarea_id: string
        }
        Update: {
          adjunto_nombre?: string | null
          adjunto_tipo?: string | null
          adjunto_url?: string | null
          autor?: string
          contenido?: string
          created_at?: string
          fijado?: boolean
          fijado_at?: string | null
          fijado_por?: string | null
          id?: string
          reacciones?: Json | null
          tarea_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_comentarios_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_etiquetas_categorias: {
        Row: {
          activo: boolean
          color: string
          created_at: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          color?: string
          created_at?: string
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          color?: string
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      tareas_etiquetas_opciones: {
        Row: {
          activo: boolean
          categoria_id: string
          created_at: string
          id: string
          orden: number
          valor: string
        }
        Insert: {
          activo?: boolean
          categoria_id: string
          created_at?: string
          id?: string
          orden?: number
          valor: string
        }
        Update: {
          activo?: boolean
          categoria_id?: string
          created_at?: string
          id?: string
          orden?: number
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_etiquetas_opciones_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "tareas_etiquetas_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_historial: {
        Row: {
          autor: string
          campo: string
          created_at: string
          id: string
          tarea_id: string
          valor_antes: string | null
          valor_nuevo: string | null
        }
        Insert: {
          autor: string
          campo: string
          created_at?: string
          id?: string
          tarea_id: string
          valor_antes?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          autor?: string
          campo?: string
          created_at?: string
          id?: string
          tarea_id?: string
          valor_antes?: string | null
          valor_nuevo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_historial_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_menciones: {
        Row: {
          autor_email: string
          comentario_id: string
          created_at: string | null
          id: string
          leido: boolean | null
          mencionado_email: string
          tarea_id: string
        }
        Insert: {
          autor_email: string
          comentario_id: string
          created_at?: string | null
          id?: string
          leido?: boolean | null
          mencionado_email: string
          tarea_id: string
        }
        Update: {
          autor_email?: string
          comentario_id?: string
          created_at?: string | null
          id?: string
          leido?: boolean | null
          mencionado_email?: string
          tarea_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_menciones_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "tareas_comentarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_menciones_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_planificacion: {
        Row: {
          created_at: string | null
          id: string
          plan_id: number
          plan_nombre: string | null
          plan_numero: string | null
          tarea_id: string
          vinculado_por: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_id: number
          plan_nombre?: string | null
          plan_numero?: string | null
          tarea_id: string
          vinculado_por: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_id?: number
          plan_nombre?: string | null
          plan_numero?: string | null
          tarea_id?: string
          vinculado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_planificacion_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_google_tokens: {
        Row: {
          refresh_token: string
          updated_at: string
          user_email: string
        }
        Insert: {
          refresh_token: string
          updated_at?: string
          user_email: string
        }
        Update: {
          refresh_token?: string
          updated_at?: string
          user_email?: string
        }
        Relationships: []
      }
      usuario_establecimiento_roles: {
        Row: {
          activo: boolean
          correo_electronico: string
          created_at: string
          email_normalizado: string
          equipo: string
          id: string
          metadata: Json
          origen: string
          rbd: string | null
          rol: string
          scope_rbd_key: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          correo_electronico: string
          created_at?: string
          email_normalizado: string
          equipo?: string
          id?: string
          metadata?: Json
          origen?: string
          rbd?: string | null
          rol: string
          scope_rbd_key?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          correo_electronico?: string
          created_at?: string
          email_normalizado?: string
          equipo?: string
          id?: string
          metadata?: Json
          origen?: string
          rbd?: string | null
          rol?: string
          scope_rbd_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_establecimiento_roles_rbd_fkey"
            columns: ["rbd"]
            isOneToOne: false
            referencedRelation: "establecimientos"
            referencedColumns: ["rbd"]
          },
        ]
      }
      usuarios_perfiles: {
        Row: {
          comuna: string | null
          correo_electronico: string
          created_at: string
          id: string
          nombre_director: string | null
          rbd: string | null
          rol: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          comuna?: string | null
          correo_electronico: string
          created_at?: string
          id: string
          nombre_director?: string | null
          rbd?: string | null
          rol?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          comuna?: string | null
          correo_electronico?: string
          created_at?: string
          id?: string
          nombre_director?: string | null
          rbd?: string | null
          rol?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_perfiles_rbd_fkey"
            columns: ["rbd"]
            isOneToOne: false
            referencedRelation: "establecimientos"
            referencedColumns: ["rbd"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_comp_time_approve_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      admin_comp_time_attach_generated_pdf: {
        Args: {
          p_file_name?: string
          p_mime_type?: string
          p_public_url?: string
          p_request_id: string
          p_size_bytes?: number
          p_storage_bucket: string
          p_storage_path: string
        }
        Returns: undefined
      }
      admin_comp_time_build_webhook_payload: {
        Args: { p_request_id: string }
        Returns: Json
      }
      admin_comp_time_load_hours: {
        Args: {
          p_email: string
          p_horas: number
          p_mes: string
          p_nota?: string
        }
        Returns: Json
      }
      admin_comp_time_reject_request: {
        Args: { p_rejection_reason: string; p_request_id: string }
        Returns: undefined
      }
      admin_comp_time_set_webhook_status: {
        Args: {
          p_request_id: string
          p_webhook_error?: string
          p_webhook_response_code?: number
          p_webhook_status: string
        }
        Returns: undefined
      }
      admin_comp_time_submit_request: {
        Args: {
          p_end_date: string
          p_end_time: string
          p_reason: string
          p_requested_hours: number
          p_start_date: string
          p_start_time: string
        }
        Returns: Json
      }
      admin_comp_time_upsert_balance: {
        Args: { p_email: string; p_horas_disponibles: number }
        Returns: Json
      }
      base_escuelas_access_rows: {
        Args: never
        Returns: {
          comuna: string
          director: string
          director_email: string
          nombre_establecimiento: string
          rbd: string
          representante: string
          representante_email: string
        }[]
      }
      base_escuelas_normalized_rows: {
        Args: never
        Returns: {
          comuna: string
          correo_electronico: string
          direccion: string
          director: string
          nombre: string
          rbd: string
        }[]
      }
      bootstrap_current_user_profile_from_base_escuelas: {
        Args: never
        Returns: undefined
      }
      current_accessible_rbds: {
        Args: never
        Returns: {
          rbd: string
        }[]
      }
      current_auth_email: { Args: never; Returns: string }
      current_user_rbd: { Args: never; Returns: string }
      ensure_establecimientos_synced: { Args: never; Returns: number }
      get_current_portal_scope: {
        Args: never
        Returns: {
          accessible_rbds: string[]
          can_select_school: boolean
          default_rbd: string
          is_global_admin: boolean
          landing_route: string
          role_text: string
        }[]
      }
      get_gmail_metrics: { Args: { p_email: string }; Returns: Json }
      get_next_session_number: {
        Args: {
          establishment_rbd: string
          session_type: Database["public"]["Enums"]["session_type"]
          target_year?: number
        }
        Returns: number
      }
      get_slep_directorio: {
        Args: never
        Returns: {
          asesor_uatp: string
          comuna: string
          correo_asesor: string
          correo_electronico: string
          correo_representante: string
          director: string
          latitud: string
          longitud: string
          nombre_establecimiento: string
          rbd: string
          representante_consejo: string
          rural_urbano: string
          tipo: string
        }[]
      }
      has_school_scope_access: {
        Args: { target_rbd: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user: { Args: { email_value?: string }; Returns: boolean }
      is_global_admin: { Args: never; Returns: boolean }
      normalize_portal_email: { Args: { raw_email: string }; Returns: string }
      save_acta_complete: {
        Args: {
          p_acuerdos: string
          p_asistentes: Json
          p_comuna: string
          p_desarrollo: string
          p_direccion: string
          p_fecha: string
          p_formato: string
          p_hora_inicio: string
          p_hora_termino: string
          p_id: string
          p_invitados: Json
          p_link_acta: string
          p_lugar: string
          p_modo_registro: string
          p_observacion_documental: string
          p_programacion_origen_id: string
          p_proxima_sesion: string
          p_rbd: string
          p_sesion: number
          p_tabla_temas: string
          p_tipo_sesion: string
          p_varios: string
        }
        Returns: string
      }
      sync_establecimientos_from_base_escuelas: { Args: never; Returns: number }
      sync_usuario_establecimiento_roles_from_base_escuelas: {
        Args: never
        Returns: number
      }
      upsert_usuario_establecimiento_rol: {
        Args: {
          p_correo_electronico: string
          p_equipo?: string
          p_metadata?: Json
          p_origen?: string
          p_rbd: string
          p_rol: string
        }
        Returns: undefined
      }
    }
    Enums: {
      log_action: "CREAR_ACTA" | "EDITAR_ACTA" | "ELIMINAR_ACTA" | "LOGIN"
      planning_status: "PROGRAMADA" | "REALIZADA" | "CANCELADA"
      session_format: "Presencial" | "Online" | "Híbrido"
      session_type: "Ordinaria" | "Extraordinaria"
      user_role: "ADMIN" | "DIRECTOR"
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
      log_action: ["CREAR_ACTA", "EDITAR_ACTA", "ELIMINAR_ACTA", "LOGIN"],
      planning_status: ["PROGRAMADA", "REALIZADA", "CANCELADA"],
      session_format: ["Presencial", "Online", "Híbrido"],
      session_type: ["Ordinaria", "Extraordinaria"],
      user_role: ["ADMIN", "DIRECTOR"],
    },
  },
} as const
