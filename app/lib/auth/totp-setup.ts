"use client";

/**
 * Dados da configuração TOTP iniciada durante a ativação da conta. Ficam apenas
 * na memória da sessão do navegador (nunca em localStorage/cookies) e são
 * descartados assim que o autenticador é confirmado.
 *
 * `userId` + `createdAt` evitam que uma chave antiga (de outro usuário ou de
 * outra ativação no mesmo navegador) seja exibida como se fosse a atual — o que
 * gera códigos TOTP inválidos (401 INVALID_CODE).
 */
const STORAGE_KEY = "sistema-academico:totp-setup";
const MAX_AGE_MS = 15 * 60_000;

export type PendingTotpSetup = {
  totpURI: string;
  backupCodes: string[];
  userId: string;
  createdAt: number;
};

function isPendingSetup(value: unknown): value is PendingTotpSetup {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PendingTotpSetup>;
  return (
    typeof candidate.totpURI === "string" &&
    candidate.totpURI.startsWith("otpauth://") &&
    Array.isArray(candidate.backupCodes) &&
    candidate.backupCodes.length === 10 &&
    candidate.backupCodes.every((code) => typeof code === "string") &&
    typeof candidate.userId === "string" &&
    typeof candidate.createdAt === "number"
  );
}

export function savePendingTotpSetup(setup: PendingTotpSetup): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
}

export function readPendingTotpSetup(userId?: string): PendingTotpSetup | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPendingSetup(parsed)) return null;
    if (Date.now() - parsed.createdAt > MAX_AGE_MS) return null;
    if (userId && parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingTotpSetup(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
