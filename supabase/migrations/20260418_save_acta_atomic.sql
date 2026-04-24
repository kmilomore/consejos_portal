-- Migration: save_acta_complete RPC
-- Replaces the 3-step client-side flow (upsertActa → replaceActaInvitados)
-- with a single atomic Postgres function. The PDF upload remains client-side
-- (Supabase Storage is not transactional with Postgres) but at least the DB
-- side is guaranteed consistent — either both acta + invitados succeed, or neither does.

CREATE OR REPLACE FUNCTION save_acta_complete(
  p_id                     uuid,
  p_programacion_origen_id uuid,
  p_rbd                    text,
  p_sesion                 integer,
  p_modo_registro          text,
  p_tipo_sesion            text,
  p_formato                text,
  p_fecha                  date,
  p_hora_inicio            time,
  p_hora_termino           time,
  p_lugar                  text,
  p_comuna                 text,
  p_direccion              text,
  p_tabla_temas            text,
  p_desarrollo             text,
  p_acuerdos               text,
  p_varios                 text,
  p_observacion_documental text,
  p_proxima_sesion         date,
  p_link_acta              text,
  p_asistentes             jsonb,
  p_invitados              jsonb   -- array of {nombre, cargo}
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Validate that the calling user can write to this RBD.
  -- Directors have a non-null rbd in their profile that must match.
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND rol = 'DIRECTOR'
      AND rbd IS NOT NULL
      AND rbd <> p_rbd
  ) THEN
    RAISE EXCEPTION 'RBD mismatch: director cannot save actas for a different school';
  END IF;

  IF p_modo_registro = 'REGISTRO_DOCUMENTAL'
     AND NULLIF(BTRIM(COALESCE(p_link_acta, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Documentary records require an attached PDF or support document';
  END IF;

  IF p_id IS NOT NULL THEN
    -- Update existing acta
    UPDATE actas SET
      programacion_origen_id = p_programacion_origen_id,
      sesion                 = p_sesion,
      modo_registro          = p_modo_registro,
      tipo_sesion            = p_tipo_sesion::session_type,
      formato                = p_formato::session_format,
      fecha                  = p_fecha,
      hora_inicio            = p_hora_inicio,
      hora_termino           = p_hora_termino,
      lugar                  = p_lugar,
      comuna                 = p_comuna,
      direccion              = p_direccion,
      tabla_temas            = p_tabla_temas,
      desarrollo             = p_desarrollo,
      acuerdos               = p_acuerdos,
      varios                 = p_varios,
      observacion_documental = p_observacion_documental,
      proxima_sesion         = p_proxima_sesion,
      link_acta              = p_link_acta,
      asistentes             = p_asistentes
    WHERE id = p_id
      AND rbd = p_rbd  -- extra RBD guard at DB level
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'acta not found or RBD mismatch on update';
    END IF;
  ELSE
    -- Insert new acta
    INSERT INTO actas (
      programacion_origen_id,
      rbd, sesion, modo_registro, tipo_sesion, formato, fecha,
      hora_inicio, hora_termino, lugar, comuna, direccion,
      tabla_temas, desarrollo, acuerdos, varios, observacion_documental,
      proxima_sesion, link_acta, asistentes
    ) VALUES (
      p_programacion_origen_id,
      p_rbd, p_sesion, p_modo_registro, p_tipo_sesion::session_type, p_formato::session_format, p_fecha,
      p_hora_inicio, p_hora_termino, p_lugar, p_comuna, p_direccion,
      p_tabla_temas, p_desarrollo, p_acuerdos, p_varios, p_observacion_documental,
      p_proxima_sesion, p_link_acta, p_asistentes
    ) RETURNING id INTO v_id;
  END IF;

  -- Replace invitados atomically (delete + insert within the same transaction)
  DELETE FROM actas_invitados WHERE acta_id = v_id;

  IF p_invitados IS NOT NULL AND jsonb_array_length(p_invitados) > 0 THEN
    INSERT INTO actas_invitados (acta_id, nombre, cargo)
    SELECT
      v_id,
      (elem->>'nombre')::text,
      (elem->>'cargo')::text
    FROM jsonb_array_elements(p_invitados) AS elem
    WHERE (elem->>'nombre') IS NOT NULL;
  END IF;

  RETURN v_id;
END;
$$;

-- Grant execute only to authenticated users (RLS on tables still applies for reads)
GRANT EXECUTE ON FUNCTION save_acta_complete TO authenticated;
