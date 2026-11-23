import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { TokenRepository } from "@/app/repositories/token.repository";
import type { TokenPurpose } from "@/app/types/common";

export const TOKEN_TTL_MS = {
  ACCOUNT_ACTIVATION: 24 * 60 * 60 * 1000,
  EMAIL_CONFIRMATION: 10 * 60 * 1000,
  PASSWORD_RESET: 30 * 60 * 1000,
} as const satisfies Record<TokenPurpose, number>;

export type IssuedToken = {
  token: string;
  code: string;
  expiresAt: Date;
};

export type ConsumedToken = {
  id: string;
  userId: string;
  purpose: TokenPurpose;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  return randomInt(0, max).toString().padStart(digits, "0");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Emissão de links de uso único (seção 8.3.1).
 *
 * O valor que circula por e-mail nunca é armazenado: o banco guarda apenas o
 * hash SHA-256. Tokens anteriores do mesmo propósito são invalidados para que
 * exista somente um link válido por vez.
 */
export class TokenService {
  constructor(private readonly repository = new TokenRepository()) {}

  async issue(userId: string, purpose: TokenPurpose): Promise<IssuedToken> {
    const token = generateToken();
    const code = generateNumericCode();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS[purpose]);

    await this.repository.invalidateForUser(userId, purpose);

    await this.repository.create({
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt,
    });

    if (purpose === "ACCOUNT_ACTIVATION") {
      await this.issueConfirmationCode(userId, code);
    }

    return { token, code, expiresAt };
  }

  async issueConfirmationCode(userId: string, code = generateNumericCode()) {
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS.EMAIL_CONFIRMATION);
    await this.repository.invalidateForUser(userId, "EMAIL_CONFIRMATION");
    await this.repository.create({
      userId,
      purpose: "EMAIL_CONFIRMATION",
      tokenHash: hashToken(code),
      expiresAt,
    });
    return { code, expiresAt };
  }

  /** Consulta um token válido sem consumi-lo (uso interno do fluxo). */
  async peek(token: string, purpose: TokenPurpose) {
    const record = await this.repository.findByHash(hashToken(token));
    if (!record || record.purpose !== purpose) return null;
    if (record.usedAt || record.expiresAt.getTime() <= Date.now()) return null;
    return record;
  }

  /**
   * Consome um token de forma atômica. Retorna `null` para token inexistente,
   * expirado, já utilizado ou de outro propósito.
   */
  async consume(token: string, purpose: TokenPurpose): Promise<ConsumedToken | null> {
    const record = await this.repository.findByHash(hashToken(token));
    if (!record) return null;
    if (record.purpose !== purpose) return null;
    if (record.usedAt) return null;
    if (record.expiresAt.getTime() <= Date.now()) {
      await this.repository.consume(record.id).catch(() => undefined);
      return null;
    }

    await this.repository.consume(record.id);
    return { id: record.id, userId: record.userId, purpose: record.purpose };
  }

  /**
   * Valida o código de confirmação de e-mail (10 minutos) sem consumi-lo.
   * O código é comparado em tempo constante.
   */
  async verifyConfirmationCode(userId: string, code: string): Promise<boolean> {
    const record = await this.repository.findByHash(hashToken(code));
    if (!record || record.userId !== userId) return false;
    if (record.purpose !== "EMAIL_CONFIRMATION") return false;
    if (record.usedAt || record.expiresAt.getTime() <= Date.now()) return false;
    return safeEqual(record.tokenHash, hashToken(code));
  }

  async consumeConfirmationCode(userId: string, code: string): Promise<boolean> {
    const record = await this.repository.findByHash(hashToken(code));
    if (!record || record.userId !== userId) return false;
    if (record.purpose !== "EMAIL_CONFIRMATION") return false;
    if (record.usedAt || record.expiresAt.getTime() <= Date.now()) return false;
    await this.repository.consume(record.id);
    return true;
  }

  invalidateForUser(userId: string, purpose?: TokenPurpose) {
    return this.repository.invalidateForUser(userId, purpose);
  }
}
