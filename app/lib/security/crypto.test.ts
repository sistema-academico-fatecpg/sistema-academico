import { beforeEach, describe, expect, it } from "vitest";
import {
  decryptBuffer,
  decryptText,
  encryptBuffer,
  encryptText,
  maskValue,
  sha256,
} from "./crypto";

const KEY = "a".repeat(64);
const PREVIOUS = "b".repeat(64);

beforeEach(() => {
  process.env.DATA_ENCRYPTION_KEY = KEY;
  delete process.env.DATA_ENCRYPTION_KEY_PREVIOUS;
});

describe("AES-256-GCM (11.2.2)", () => {
  it("criptografa e descriptografa texto com autenticação", () => {
    const payload = encryptText("Laudo médico confidencial");
    expect(payload.cipherText).not.toContain("Laudo");
    expect(decryptText(payload)).toBe("Laudo médico confidencial");
    expect(() =>
      decryptText({ ...payload, authTag: Buffer.alloc(16).toString("base64") }),
    ).toThrow();
  });

  it("aceita chave anterior durante rotação", () => {
    process.env.DATA_ENCRYPTION_KEY = PREVIOUS;
    const payload = encryptText("dado antigo");
    process.env.DATA_ENCRYPTION_KEY = KEY;
    process.env.DATA_ENCRYPTION_KEY_PREVIOUS = PREVIOUS;
    expect(decryptText(payload)).toBe("dado antigo");
  });

  it("criptografa buffers de backup e calcula checksum", () => {
    const original = Buffer.from('{"tabela":"grades"}');
    const payload = encryptBuffer(original);
    expect(sha256(original)).toHaveLength(64);
    expect(decryptBuffer(payload)).toEqual(original);
  });

  it("mascara valores sensíveis", () => {
    expect(maskValue("123456789")).toBe("12••••89");
    expect(maskValue("abc")).toBe("••••");
  });
});
