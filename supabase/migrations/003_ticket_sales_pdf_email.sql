-- ============================================================
-- Flag-Fest · Venta real de entradas, PDF y correo (Fase 3)
--
-- Añade a `tickets` los campos necesarios para el flujo de venta
-- real (código corto, seguimiento de correo, ruta del PDF y notas),
-- crea una secuencia global para los códigos cortos, un RPC atómico
-- que numera y crea la entrada bajo bloqueo por evento, y el bucket
-- privado de Storage `tickets`.
--
-- Ejecutar después de 002_internal_usernames.sql. Es idempotente.
-- ============================================================

-- ============================================================
-- 1. NUEVAS COLUMNAS EN tickets  (no se elimina ninguna existente)
-- ============================================================

alter table public.tickets
  add column if not exists short_code        text,
  add column if not exists email_sent_at     timestamptz,
  add column if not exists email_last_error  text,
  add column if not exists resend_email_id   text,
  add column if not exists notes             text,
  add column if not exists pdf_storage_path  text;

-- Unicidad del código corto (permite múltiples NULL en Postgres).
create unique index if not exists tickets_short_code_key
  on public.tickets (short_code);

-- ============================================================
-- 2. SECUENCIA GLOBAL DE CÓDIGOS CORTOS  (FF-0001, FF-0002, …)
-- ============================================================

create sequence if not exists public.ticket_short_code_seq
  as integer
  start with 1
  increment by 1;

-- ============================================================
-- 3. RPC ATÓMICO DE CREACIÓN DE ENTRADA
--
-- Numera (ticket_number por evento + short_code global) y crea la
-- entrada dentro de una única transacción, serializada por evento
-- con un advisory lock. Revalida el límite global y el cupo del
-- vendedor bajo el lock para evitar sobreventa por concurrencia.
--
-- Excepciones (las mapea el endpoint a mensajes amables):
--   GLOBAL_SOLD_OUT  → se agotó el total del evento.
--   SELLER_SOLD_OUT  → el vendedor no tiene cupo disponible.
-- ============================================================

create or replace function public.create_ticket(
  p_event_id          uuid,
  p_seller_id         uuid,
  p_sale_phase_id     uuid,
  p_customer_name     text,
  p_customer_email    text,
  p_selected_color    text,
  p_price             numeric,
  p_qr_token          text,
  p_qr_hash           text,
  p_notes             text,
  p_total_tickets     integer,
  p_seller_allocation integer
)
returns setof public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_global integer;
  v_seller integer;
  v_number integer;
  v_short  text;
  v_ticket public.tickets;
begin
  -- Serializar la numeración y las validaciones de cupo por evento.
  perform pg_advisory_xact_lock(hashtext(p_event_id::text));

  -- Límite global del evento (sold y used cuentan como vendidas).
  select count(*) into v_global
  from public.tickets
  where event_id = p_event_id and status in ('sold', 'used');

  if v_global >= p_total_tickets then
    raise exception 'GLOBAL_SOLD_OUT';
  end if;

  -- Cupo del vendedor (todo lo que no esté cancelado cuenta).
  -- p_seller_allocation NULL ⇒ venta administrativa sin tope propio.
  if p_seller_allocation is not null then
    select count(*) into v_seller
    from public.tickets
    where event_id = p_event_id
      and seller_id = p_seller_id
      and status <> 'cancelled';

    if v_seller >= p_seller_allocation then
      raise exception 'SELLER_SOLD_OUT';
    end if;
  end if;

  -- Numeración por evento y código corto global.
  select coalesce(max(ticket_number), 0) + 1 into v_number
  from public.tickets
  where event_id = p_event_id;

  v_short := 'FF-' || lpad(nextval('public.ticket_short_code_seq')::text, 4, '0');

  insert into public.tickets (
    event_id, seller_id, sale_phase_id, ticket_number, short_code,
    qr_token, qr_hash, customer_name, customer_email, selected_color,
    price, status, notes
  ) values (
    p_event_id, p_seller_id, p_sale_phase_id, v_number, v_short,
    p_qr_token, p_qr_hash, p_customer_name, p_customer_email, p_selected_color,
    p_price, 'sold', nullif(btrim(p_notes), '')
  )
  returning * into v_ticket;

  return next v_ticket;
  return;
end;
$$;

-- ============================================================
-- 4. BUCKET PRIVADO DE STORAGE  `tickets`
--
-- Se crea de forma idempotente. Es privado: la app sube y descarga
-- los PDF server-side con la clave service_role (que salta las
-- políticas de Storage), por lo que no se definen policies públicas.
-- Si el rol que ejecuta la migración no puede tocar storage.buckets,
-- créalo manualmente siguiendo supabase/STORAGE_SETUP.md.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', false)
on conflict (id) do nothing;
