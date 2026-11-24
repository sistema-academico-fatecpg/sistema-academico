import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function keyFromEnv(name: string): Buffer | null {
  const value = process.env[name]?.trim();
  if (!value) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${name} deve ter 32 bytes em hexadecimal (64 caracteres)`);
  }
  return Buffer.from(value, "hex");
}

function activeKey(): Buffer {
  const key = keyFromEnv("DATA_ENCRYPTION_KEY");
  if (!key) {
    throw new Error("DATA_ENCRYPTION_KEY não configurada (cofre de chaves, 11.2.3)");
  }
  return key;
}

function candidateKeys(): Buffer[] {
  const keys = [activeKey()];
  const previous = keyFromEnv("DATA_ENCRYPTION_KEY_PREVIOUS");
  if (previous && !previous.equals(keys[0])) keys.push(previous);
  return keys;
}

export type EncryptedPayload = {
  cipherText: string;
  iv: string;
  authTag: string;
};

/** AES-256-GCM para dados sensíveis e backups (11.2.2). */
export function encryptText(plaintext: string): EncryptedPayload {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, activeKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    cipherText: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptText(payload: EncryptedPayload): string {
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const encrypted = Buffer.from(payload.cipherText, "base64");
  for (const key of candidateKeys()) {
    try {
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    } catch {
      // Tenta a chave anterior durante rotação anual (11.2.4).
    }
  }
  throw new Error("Não foi possível descriptografar: chave ausente ou registro íntegro?");
}

export type EncryptedBuffer = {
  cipherText: Buffer;
  iv: Buffer;
  authTag: Buffer;
};

export function encryptBuffer(data: Buffer): EncryptedBuffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, activeKey(), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return { cipherText: encrypted, iv, authTag: cipher.getAuthTag() };
}

export function decryptBuffer(payload: EncryptedBuffer): Buffer {
  for (const key of candidateKeys()) {
    try {
      const decipher = createDecipheriv(ALGORITHM, key, payload.iv);
      decipher.setAuthTag(payload.authTag);
      return Buffer.concat([decipher.update(payload.cipherText), decipher.final()]);
    } catch {
      // Próxima chave.
    }
  }
  throw new Error("Não foi possível descriptografar o backup");
}

export function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Exibição mascarada quando o dado sensível não é necessário (11.1.2). */
export function maskValue(value: string): string {
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}
