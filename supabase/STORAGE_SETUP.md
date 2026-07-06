# Storage · Bucket privado `tickets` (Fase 3)

Los PDF de las entradas se guardan en un bucket **privado** de Supabase Storage
llamado `tickets`, en la ruta:

```
tickets/{event_id}/{ticket_id}.pdf
```

La subida y la descarga se hacen **siempre en el servidor** con la clave
`SUPABASE_SERVICE_ROLE_KEY`, que salta las políticas (RLS) de Storage. Por eso el
bucket no necesita políticas públicas ni de lectura para clientes anónimos.

## Opción A · Por migración (recomendado)

La migración `003_ticket_sales_pdf_email.sql` ya intenta crearlo:

```sql
insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', false)
on conflict (id) do nothing;
```

Al ejecutar la migración en el **SQL Editor de Supabase** (que corre como rol
`postgres`) el bucket se crea automáticamente. No necesitas hacer nada más.

## Opción B · Manual (si la migración no pudo crear el bucket)

1. Entra al panel de Supabase → **Storage** → **New bucket**.
2. Nombre: `tickets`.
3. **Public bucket: desactivado** (privado).
4. Guardar.

No hace falta añadir políticas: el acceso ocurre server-side con service role.

## Verificación

Tras la primera venta real deberías ver en Storage → `tickets` una carpeta con
el `event_id` y dentro `{ticket_id}.pdf`.
