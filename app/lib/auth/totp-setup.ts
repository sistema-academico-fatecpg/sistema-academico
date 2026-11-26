"use client";

/**
 * Dados da configuração TOTP iniciada durante a ativação da conta. Ficam apenas
 * na memória da sessão do navegador (nunca em localStorage/cookies) e são
 * descartados assim que o autenticador é confirmado.
 */
const STORAGE_KEY = "sistema-academico:totp-setup";

export type PendingTotpSetup = {
  totpURI: string;
  backupCodes: string[];
};

function isPendingSetup(value: unknown): value is PendingTotpSetup {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PendingTotpSetup>;
  return (
    typeof candidate.totpURI === "string" &&
    candidate.totpURI.startsWith("otpauth://") &&
    Array.isArray(candidate.backupCodes) &&
    candidate.backupCodes.length === 10 &&
    candidate.backupCodes.every((code) => typeof code === "string")
  );
}

export function savePendingTotpSetup(setup: PendingTotpSetup): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
}

export function readPendingTotpSetup(): PendingTotpSetup | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isPendingSetup(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingTotpSetup(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
