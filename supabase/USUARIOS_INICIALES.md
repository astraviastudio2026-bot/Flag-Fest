# Usuarios internos iniciales · Flag-Fest

El personal del sistema NO usa correos reales. Se manejan como **usuarios
internos** con correos ficticios bajo el dominio local `@flagfest.local`.
En el login basta con escribir el usuario (p. ej. `admin`); el sistema lo
completa a `admin@flagfest.local`.

No se envían correos de confirmación: las cuentas se crean ya confirmadas
(`email_confirm: true`).

## Usuarios recomendados

| Usuario interno | Correo técnico             | Contraseña temporal | Rol        |
| --------------- | -------------------------- | ------------------- | ---------- |
| `admin`         | `admin@flagfest.local`     | `Admin2026*`        | admin      |
| `vendedor1`     | `vendedor1@flagfest.local` | `Vendedor2026*`     | seller     |
| `vendedor2`     | `vendedor2@flagfest.local` | `Vendedor2026*`     | seller     |
| `validador`     | `validador@flagfest.local` | `Validador2026*`    | validator  |

> Cambia estas contraseñas temporales en un entorno real.

## Cómo crear el primer administrador (bootstrap)

Supabase Auth no permite crear el primer usuario desde la app (hace falta un
admin ya existente). Crea el admin inicial **una sola vez** por cualquiera de
estas vías:

### Opción A · Panel de Supabase (recomendada)

1. Supabase → **Authentication → Users → Add user**.
2. Email: `admin@flagfest.local`, Password: `Admin2026*`.
3. Marca **Auto Confirm User** (para no requerir confirmación por correo).
4. El trigger `handle_new_user` crea el `profile` con rol `seller` por
   defecto. Elévalo a admin en el **SQL Editor**:

   ```sql
   update public.profiles
     set role = 'admin', username = 'admin', full_name = 'Administrador'
     where email = 'admin@flagfest.local';
   ```

### Opción B · Script con service_role (fuera del navegador)

```ts
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data } = await admin.auth.admin.createUser({
  email: "admin@flagfest.local",
  password: "Admin2026*",
  email_confirm: true,
  user_metadata: { full_name: "Administrador", username: "admin", role: "admin" },
});

await admin.from("profiles").upsert({
  id: data.user!.id,
  full_name: "Administrador",
  email: "admin@flagfest.local",
  username: "admin",
  role: "admin",
  is_active: true,
});
```

## El resto de usuarios

Una vez que exista un admin, inicia sesión y crea vendedores/validadores (y
más admins) desde **Panel de administración → Usuarios**, escribiendo solo el
usuario interno (`vendedor1`, `validador`, …). El endpoint
`POST /api/admin/users/create` normaliza el usuario a su correo interno y los
crea con `service_role`, ya confirmados.
