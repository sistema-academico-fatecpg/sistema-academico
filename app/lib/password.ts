import { hash, verify } from "@node-rs/argon2";

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, {
    memoryCost: 65536,
    timeCost: 3,
    outputLen: 32,
    parallelism: 4,
  });
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return verify(hash, plain);
}
