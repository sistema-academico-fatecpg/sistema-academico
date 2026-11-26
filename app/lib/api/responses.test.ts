import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "@/app/lib/auth/errors";
import { jsonError } from "./responses";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("jsonError", () => {
  it("loga a mensagem real e devolve resposta genérica para erro desconhecido", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = jsonError(
      new Error("falha ao consultar token=segredo123 para pessoa@exemplo.com"),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Erro interno", code: "INTERNAL" });
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("falha ao consultar");
    expect(logged).not.toContain("segredo123");
    expect(logged).not.toContain("pessoa@exemplo.com");
  });

  it("mantém a mensagem dos erros esperados sem registrar ruído", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = jsonError(new AuthError("Autenticação necessária", "UNAUTHENTICATED", 401));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Autenticação necessária",
      code: "UNAUTHENTICATED",
      details: null,
    });
    expect(log).not.toHaveBeenCalled();
  });
});
