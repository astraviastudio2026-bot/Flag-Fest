"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "./icons";

/**
 * Cierra la sesión vía `POST /api/auth/logout` (Route Handler) y navega
 * a /login. Evita la Server Action `signOut`, que fallaba con "Invalid
 * Server Actions request" detrás del proxy.
 */
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Aunque falle la red, redirigimos: la sesión se revalida en el
      // servidor y las rutas protegidas exigirán volver a ingresar.
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={pending}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3.5 font-condensed text-sm font-semibold uppercase tracking-wide text-muted transition-all duration-200 hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
    >
      <LogOutIcon size={16} />
      <span>{pending ? "Saliendo…" : "Salir"}</span>
    </button>
  );
}
