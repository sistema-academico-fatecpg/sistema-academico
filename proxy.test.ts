import { describe, expect, it } from "vitest";
import { shouldEnforceHttps } from "./proxy";

describe("shouldEnforceHttps", () => {
  it("não redireciona em desenvolvimento, mesmo com NODE_ENV=production no build", () => {
    expect(shouldEnforceHttps("localhost", "development", "http://localhost:3000")).toBe(false);
  });

  it("não redireciona hosts locais em produção", () => {
    expect(shouldEnforceHttps("0.0.0.0", "production", "https://app.example.edu")).toBe(false);
    expect(shouldEnforceHttps("127.0.0.1", "production", "https://app.example.edu")).toBe(false);
  });

  it("não redireciona quando a URL pública é HTTP", () => {
    expect(shouldEnforceHttps("app.example.edu", "production", "http://app.example.edu")).toBe(
      false,
    );
  });

  it("redireciona apenas produção com URL HTTPS e host público", () => {
    expect(shouldEnforceHttps("app.example.edu", "production", "https://app.example.edu")).toBe(
      true,
    );
  });
});
