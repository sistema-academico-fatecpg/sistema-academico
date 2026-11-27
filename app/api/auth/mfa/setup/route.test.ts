// @vitest-environment node

import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { symmetricDecrypt } from "better-auth/crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET_KEY = "test-better-auth-secret-000000000000";

const { findFirst, update, create, requireUserForMfaSetup } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  requireUserForMfaSetup: vi.fn(),
}));

vi.mock("@/app/lib/db", () => ({
  db: { twoFactor: { findFirst, update, create } },
}));

vi.mock("@/app/lib/auth/session", () => ({ requireUserForMfaSetup }));

import { POST } from "./route";

async function setup() {
  const response = await POST(
    new Request("http://localhost/api/auth/mfa/setup", {
      method: "POST",
      body: "{}",
    }),
  );
  expect(response.status).toBe(200);
  return (await response.json()) as { totpURI: string; backupCodes: string[] };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BETTER_AUTH_SECRET = SECRET_KEY;
  requireUserForMfaSetup.mockResolvedValue({ id: "user-1", email: "aluno@example.com" });
  findFirst.mockResolvedValue(null);
  create.mockResolvedValue({});
  update.mockResolvedValue({});
});

describe("POST /api/auth/mfa/setup", () => {
  it("gera URI otpauth com secret em Base32, no formato aceito por autenticadores", async () => {
    const { totpURI, backupCodes } = await setup();
    const uri = new URL(totpURI);

    expect(uri.protocol).toBe("otpauth:");
    expect(uri.host).toBe("totp");
    expect(uri.pathname).toBe("/Sistema%20Acad%C3%AAmico:aluno%40example.com");
    expect(uri.searchParams.get("secret")).toMatch(/^[A-Z2-7]+$/);
    expect(uri.searchParams.get("issuer")).toBe("Sistema Acadêmico");
    expect(uri.searchParams.get("digits")).toBe("6");
    expect(uri.searchParams.get("period")).toBe("30");
    expect(backupCodes).toHaveLength(10);
  });

  it("o Base32 do QR decodifica exatamente para a chave usada pelo verifyTotp", async () => {
    const { totpURI } = await setup();
    const encrypted = create.mock.calls[0]?.[0].data.secret as string;
    const plainSecret = await symmetricDecrypt({ key: SECRET_KEY, data: encrypted });
    const uriSecret = new URL(totpURI).searchParams.get("secret") as string;

    // createOTP (usado pelo Better Auth em verify-totp) trata o secret como
    // bytes UTF-8; o autenticador decodifica o Base32 da URI para a mesma chave.
    expect(Buffer.from(base32.decode(uriSecret))).toEqual(Buffer.from(plainSecret, "utf8"));
    expect(new URL(totpURI).searchParams.get("secret")).toBe(
      base32.encode(plainSecret, { padding: false }),
    );
    expect(typeof (await createOTP(plainSecret).totp())).toBe("string");
  });
});
