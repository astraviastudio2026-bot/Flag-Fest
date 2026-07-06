"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { UsersIcon } from "@/components/icons";
import { FormMessage, fieldInput, fieldLabel } from "./FormMessage";

/**
 * Crea un vendedor o validador vía el endpoint server-side seguro
 * (`POST /api/admin/users/create`). La service_role nunca sale del
 * servidor: aquí solo enviamos los datos del formulario.
 */
export function CreateUserForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string | null; message?: string }>(
    {},
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setResult({});

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      full_name: String(fd.get("full_name") ?? ""),
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      role: String(fd.get("role") ?? "seller"),
    };

    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ error: data.error ?? "No se pudo crear el usuario." });
      } else {
        setResult({ ok: true, message: `Usuario ${data.user.email} creado.` });
        form.reset();
        router.refresh();
      }
    } catch {
      setResult({ error: "Error de red. Inténtalo de nuevo." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Nombre completo</span>
          <input
            name="full_name"
            required
            placeholder="María Fernández"
            className={fieldInput}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Correo electrónico</span>
          <input
            type="email"
            name="email"
            required
            placeholder="vendedor@correo.com"
            className={fieldInput}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Contraseña temporal</span>
          <input
            type="text"
            name="password"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            className={fieldInput}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Rol</span>
          <select name="role" required defaultValue="seller" className={fieldInput}>
            <option value="seller">Vendedor</option>
            <option value="validator">Validador</option>
          </select>
        </label>
      </div>

      <FormMessage ok={result.ok} error={result.error} message={result.message} />

      <ActionButton
        type="submit"
        size="lg"
        disabled={pending}
        icon={<UsersIcon size={18} />}
        className="mt-1 self-start"
      >
        {pending ? "Creando…" : "Crear usuario"}
      </ActionButton>
    </form>
  );
}
