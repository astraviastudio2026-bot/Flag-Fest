-- ============================================================
-- Flag-Fest · Escáner QR y validación en puerta (Fase 4)
--
-- Crea el RPC atómico `validate_ticket_scan` que localiza la
-- entrada por qr_hash (o short_code para validación manual), la
-- bloquea con FOR UPDATE para evitar dobles ingresos simultáneos,
-- la marca como usada si procede y registra SIEMPRE el intento en
-- ticket_validations. Añade un índice para el historial.
--
-- Ejecutar después de 003_ticket_sales_pdf_email.sql. Es idempotente.
-- ============================================================

-- Historial de validaciones ordenado por fecha (scanner y admin).
create index if not exists idx_validations_scanned_at
  on public.ticket_validations (scanned_at desc);

-- ============================================================
-- RPC ATÓMICO DE VALIDACIÓN DE ENTRADA
--
-- Se busca por p_qr_hash si viene; si no, por p_short_code
-- (validación manual "FF-0001"). `select … for update` serializa
-- dos escaneos simultáneos del mismo ticket: el segundo espera el
-- commit del primero y ya la encuentra en estado 'used'.
--
-- Devuelve jsonb: { "result": valid|already_used|cancelled|invalid,
--                   "ticket_id": uuid|null }
-- ============================================================

create or replace function public.validate_ticket_scan(
  p_qr_hash      text,
  p_validator_id uuid,
  p_metadata     jsonb default '{}'::jsonb,
  p_short_code   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket  public.tickets;
  v_result  text;
  v_message text;
begin
  if p_qr_hash is not null then
    select * into v_ticket
    from public.tickets
    where qr_hash = p_qr_hash
    for update;
  elsif p_short_code is not null then
    select * into v_ticket
    from public.tickets
    where short_code = p_short_code
    for update;
  end if;

  if v_ticket.id is null then
    v_result  := 'invalid';
    v_message := 'QR inválido o no registrado.';
    insert into public.ticket_validations (ticket_id, validator_id, result, message, metadata)
    values (null, p_validator_id, v_result, v_message, coalesce(p_metadata, '{}'::jsonb));
    return jsonb_build_object('result', v_result, 'ticket_id', null);
  end if;

  if v_ticket.status = 'cancelled' then
    v_result  := 'cancelled';
    v_message := 'Esta entrada fue anulada.';
  elsif v_ticket.status = 'used' then
    v_result  := 'already_used';
    v_message := 'Esta entrada ya fue utilizada.';
  elsif v_ticket.status = 'sold' then
    update public.tickets
       set status       = 'used',
           used_at      = now(),
           validated_by = p_validator_id
     where id = v_ticket.id;
    v_result  := 'valid';
    v_message := 'Entrada válida. Ingreso autorizado.';
  else
    -- Estado desconocido: no autorizar nunca.
    v_result  := 'invalid';
    v_message := 'Estado de entrada no reconocido.';
  end if;

  insert into public.ticket_validations (ticket_id, validator_id, result, message, metadata)
  values (v_ticket.id, p_validator_id, v_result, v_message, coalesce(p_metadata, '{}'::jsonb));

  return jsonb_build_object('result', v_result, 'ticket_id', v_ticket.id);
end;
$$;

-- La función salta RLS (security definer): solo debe poder invocarla
-- el backend con service_role. Los endpoints ya verifican el rol
-- admin/validator antes de llamarla.
revoke execute on function public.validate_ticket_scan(text, uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.validate_ticket_scan(text, uuid, jsonb, text)
  to service_role;
