"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { UsersIcon } from "@/components/icons";
import { ROLE_LABELS } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { FormMessage } from "./FormMessage";

/**
 * Lista de usuarios (vendedores/validadores) con activar/desactivar.
 * El cambio de estado se hace vía `POST /api/admin/users/toggle`
 * (fetch), en lugar de una Server Action.
 */
export function UsersList({ users }: { users: Profile[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(userId: string, nextActive: boolean) {
    setPendingId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, next_active: nextActive }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "No se pudo actualizar el usuario.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setPendingId(null);
    }
  }

  if (users.length === 0) {
    return (
      <EmptyState
        title="Sin usuarios todavía"
        description="Crea vendedores o validadores con el formulario de arriba."
        icon={<UsersIcon size={26} />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FormMessage error={error} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-2">
              <th className="px-4 py-3 font-condensed font-medium">Nombre</th>
              <th className="px-4 py-3 font-condensed font-medium">Rol</th>
              <th className="px-4 py-3 font-condensed font-medium">Estado</th>
              <th className="px-4 py-3 font-condensed font-medium text-right">
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const busy = pendingId === u.id;
              return (
                <tr
                  key={u.id}
                  className="border-b border-border/60 last:border-0 hover:bg-surface-2/50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{u.full_name}</p>
                    <p className="text-xs text-muted-2">
                      {u.username ? `@${u.username}` : u.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.is_active ? "valid" : "void"}>
                      {u.is_active ? "Activo" : "Inactivo"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggle(u.id, !u.is_active)}
                      disabled={busy}
                      className={`inline-flex h-8 items-center rounded-lg border px-3 font-condensed text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-50 ${
                        u.is_active
                          ? "border-flag-red/40 text-flag-red-glow hover:bg-flag-red/10"
                          : "border-flag-green/40 text-flag-green-glow hover:bg-flag-green/10"
                      }`}
                    >
                      {busy ? "…" : u.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
