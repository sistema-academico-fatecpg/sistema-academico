import { afterEach, describe, expect, it } from "vitest";
import { activationUrl, appBaseUrl } from "./activation";

const originalBaseUrl = process.env.BETTER_AUTH_URL;

afterEach(() => {
  if (originalBaseUrl === undefined) delete process.env.BETTER_AUTH_URL;
  else process.env.BETTER_AUTH_URL = originalBaseUrl;
});

describe("link de ativação", () => {
  it("carrega token e código de confirmação na URL", () => {
    process.env.BETTER_AUTH_URL = "https://app.local/";
    const url = new URL(activationUrl("token-abc", "123456"));
    expect(`${url.origin}${url.pathname}`).toBe("https://app.local/ativar");
    expect(url.searchParams.get("token")).toBe("token-abc");
    expect(url.searchParams.get("code")).toBe("123456");
    expect(appBaseUrl()).toBe("https://app.local");
  });

  it("omite o código quando ele ainda não foi emitido", () => {
    process.env.BETTER_AUTH_URL = "https://app.local";
    const url = new URL(activationUrl("token-abc"));
    expect(url.searchParams.has("code")).toBe(false);
  });
});
