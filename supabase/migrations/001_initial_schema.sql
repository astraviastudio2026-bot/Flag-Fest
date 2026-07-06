-- ============================================================
-- Flag-Fest · Esquema inicial (Fase 2)
-- Sistema de venta y validación QR de entradas.
--
-- Incluye: tablas, índices, funciones utilitarias, trigger de
-- alta de usuarios, triggers de updated_at y Row Level Security.
--
-- Diseñado para Supabase (Postgres). Ejecutar una sola vez.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. TABLAS
-- ============================================================

-- ---- profiles -------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  role        text not null check (role in ('admin', 'seller', 'validator')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---- events ---------------------------------------------------
create table if not exists public.events (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  location       text,
  event_date     date not null,
  total_tickets  integer not null default 600,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---- sale_phases ----------------------------------------------
create table if not exists public.sale_phases (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  name         text not null,
  phase_order  integer not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  price        numeric(10, 2) not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---- seller_allocations ---------------------------------------
create table if not exists public.seller_allocations (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  seller_id           uuid not null references public.profiles(id) on delete cascade,
  allocated_quantity  integer not null check (allocated_quantity >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (event_id, seller_id)
);

-- ---- tickets --------------------------------------------------
create table if not exists public.tickets (
  id                   uuid primary key default gen_random_uuid(),
  event_id             uuid not null references public.events(id) on delete cascade,
  seller_id            uuid not null references public.profiles(id),
  sale_phase_id        uuid references public.sale_phases(id),
  ticket_number        integer not null,
  qr_token             text not null unique,
  qr_hash              text not null unique,
  customer_name        text not null,
  customer_email       text not null,
  selected_color       text not null check (selected_color in ('verde', 'rojo', 'amarillo')),
  price                numeric(10, 2) not null,
  status               text not null default 'sold' check (status in ('sold', 'used', 'cancelled')),
  pdf_url              text,
  sold_at              timestamptz not null default now(),
  used_at              timestamptz,
  validated_by         uuid references public.profiles(id),
  cancelled_at         timestamptz,
  cancelled_by         uuid references public.profiles(id),
  cancellation_reason  text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (event_id, ticket_number)
);

-- ---- ticket_validations ---------------------------------------
create table if not exists public.ticket_validations (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid references public.tickets(id) on delete cascade,
  validator_id  uuid references public.profiles(id),
  result        text not null,
  message       text not null,
  scanned_at    timestamptz not null default now(),
  metadata      jsonb
);

-- ---- audit_logs -----------------------------------------------
create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles(id),
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 2. ÍNDICES
-- ============================================================

create index if not exists idx_profiles_role              on public.profiles (role);
create index if not exists idx_profiles_email             on public.profiles (email);
create index if not exists idx_tickets_event_id           on public.tickets (event_id);
create index if not exists idx_tickets_seller_id          on public.tickets (seller_id);
create index if not exists idx_tickets_qr_hash            on public.tickets (qr_hash);
create index if not exists idx_tickets_customer_email     on public.tickets (customer_email);
create index if not exists idx_tickets_status             on public.tickets (status);
create index if not exists idx_tickets_selected_color     on public.tickets (selected_color);
create index if not exists idx_alloc_seller_id            on public.seller_allocations (seller_id);
create index if not exists idx_alloc_event_id             on public.seller_allocations (event_id);
create index if not exists idx_phases_event_id            on public.sale_phases (event_id);
create index if not exists idx_validations_ticket_id      on public.ticket_validations (ticket_id);

-- ============================================================
-- 3. FUNCIONES UTILITARIAS
-- ============================================================

-- ---- updated_at automático ------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---- Helpers de rol (SECURITY DEFINER para evitar recursión RLS)
-- Al ser SECURITY DEFINER, estas funciones consultan profiles
-- saltando RLS, evitando dependencias circulares en las políticas.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  );
$$;

-- ---- Alta automática de perfil al registrar un usuario --------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  final_role text;
begin
  meta_role := new.raw_user_meta_data ->> 'role';
  if meta_role in ('admin', 'seller', 'validator') then
    final_role := meta_role;
  else
    final_role := 'seller';
  end if;

  insert into public.profiles (id, full_name, email, role, is_active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    new.email,
    final_role,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists trg_alloc_updated_at on public.seller_allocations;
create trigger trg_alloc_updated_at
  before update on public.seller_allocations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tickets_updated_at on public.tickets;
create trigger trg_tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.events             enable row level security;
alter table public.sale_phases        enable row level security;
alter table public.seller_allocations enable row level security;
alter table public.tickets            enable row level security;
alter table public.ticket_validations enable row level security;
alter table public.audit_logs         enable row level security;

-- ---- profiles -------------------------------------------------
-- El usuario lee su propio perfil.
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- El admin lee todos los perfiles.
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

-- El admin inserta perfiles.
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (public.is_admin());

-- El admin actualiza / desactiva perfiles.
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- events ---------------------------------------------------
-- Usuarios activos leen eventos activos; el admin lee todos.
create policy events_select on public.events
  for select to authenticated
  using (public.is_admin() or (public.is_active_user() and is_active = true));

create policy events_admin_all on public.events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- sale_phases ----------------------------------------------
create policy phases_select on public.sale_phases
  for select to authenticated
  using (public.is_admin() or (public.is_active_user() and is_active = true));

create policy phases_admin_all on public.sale_phases
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- seller_allocations ---------------------------------------
-- El vendedor lee solo su asignación.
create policy alloc_select_own on public.seller_allocations
  for select to authenticated
  using (seller_id = auth.uid());

-- El admin lee y gestiona todas las asignaciones.
create policy alloc_admin_all on public.seller_allocations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- tickets --------------------------------------------------
-- El admin lee todo.
create policy tickets_select_admin on public.tickets
  for select to authenticated
  using (public.is_admin());

-- El vendedor lee solo sus tickets.
create policy tickets_select_own on public.tickets
  for select to authenticated
  using (seller_id = auth.uid());

-- El validador lee tickets para validación.
create policy tickets_select_validator on public.tickets
  for select to authenticated
  using (public.current_user_role() = 'validator');

-- Nota: no hay política de INSERT/UPDATE desde cliente en esta fase.
-- Las ventas reales usarán un endpoint server-side (service role) en fase 3.

-- ---- ticket_validations ---------------------------------------
-- El admin lee todo.
create policy validations_select_admin on public.ticket_validations
  for select to authenticated
  using (public.is_admin());

-- El validador lee sus propias validaciones.
create policy validations_select_own on public.ticket_validations
  for select to authenticated
  using (validator_id = auth.uid());

-- El validador inserta validaciones (a su nombre).
create policy validations_insert_validator on public.ticket_validations
  for insert to authenticated
  with check (
    public.current_user_role() = 'validator' and validator_id = auth.uid()
  );

-- (Seller no tiene políticas de escritura sobre validaciones.)

-- ---- audit_logs -----------------------------------------------
-- El admin lee todo.
create policy audit_select_admin on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- El admin puede registrar logs desde acciones de servidor.
-- (El service role salta RLS para inserciones del sistema.)
create policy audit_insert_admin on public.audit_logs
  for insert to authenticated
  with check (public.is_admin());
