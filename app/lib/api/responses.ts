import { ZodError } from "zod";
import { AuthError } from "@/app/lib/auth/errors";
import { RepositoryError } from "@/app/repositories/errors";
import type { RoleName } from "@/app/types/common";

export function jsonError(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json(
      { error: error.message, code: error.code, details: error.details ?? null },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "Dados inválidos",
        code: "VALIDATION",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }
  if (error instanceof RepositoryError) {
    const status = error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : 400;
    return Response.json({ error: error.message, code: error.code }, { status });
  }
  // Nunca expor detalhes internos ao cliente (seção 12.7).
  console.error("[api] erro não tratado", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "Erro interno", code: "INTERNAL" }, { status: 500 });
}

export function actorFrom(user: { id: string; roles: RoleName[] }, request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
  return {
    actorId: user.id,
    actorRoles: user.roles,
    ipAddress,
  };
}
