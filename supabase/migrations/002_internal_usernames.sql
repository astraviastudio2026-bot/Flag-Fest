-- ============================================================
-- Flag-Fest · Usuarios internos (Fase 2.1)
--
-- Añade un "usuario interno" (username) a los perfiles para mostrar
-- el identificador sin el dominio técnico. El email sigue siendo el
-- campo técnico requerido por Supabase Auth.
--
-- Ejecutar después de 001_initial_schema.sql.
-- ============================================================

-- 1. Columna username (única, opcional a nivel de columna).
alter table public.profiles
  add column if not exists username text;

-- 2. Backfill: derivar el username de la parte local del email.
update public.profiles
  set username = split_part(email, '@', 1)
  where username is null;

-- 3. Unicidad del username (permite múltiples NULL en Postgres).
create unique index if not exists profiles_username_key
  on public.profiles (username);

-- 4. Recrear handle_new_user para poblar también el username.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  final_role text;
  final_username text;
begin
  meta_role := new.raw_user_meta_data ->> 'role';
  if meta_role in ('admin', 'seller', 'validator') then
    final_role := meta_role;
  else
    final_role := 'seller';
  end if;

  final_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name, email, username, role, is_active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    new.email,
    final_username,
    final_role,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
