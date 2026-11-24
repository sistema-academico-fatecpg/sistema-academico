import { hash, verify } from "@node-rs/argon2";

/**
 * Hash de senha com Argon2id (Política de Segurança, seção 8.3.5).
 *
 * Os parâmetros seguem a recomendação da OWASP para Argon2id e são gravados
 * no próprio hash PHC, permitindo verificar hashes antigos após ajustes.
 */
const HASH_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, HASH_OPTIONS);
}

export async function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  try {
    return await verify(hashValue, password);
  } catch {
    return false;
  }
}
