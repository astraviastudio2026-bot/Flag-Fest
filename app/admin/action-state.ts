/**
 * Estado compartido de los formularios de admin (módulo neutro:
 * NO lleva "use server", por lo que puede exportar tipos y valores).
 */

export interface ActionState {
  ok: boolean;
  error: string | null;
  message?: string;
}

export const idleActionState: ActionState = { ok: false, error: null };
