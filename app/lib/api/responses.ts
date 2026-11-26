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
  // Nunca expor detalhes internos ao cliente (seção 12.7), mas registrar o
  // motivo real no servidor para permitir diagnóstico sem vazar segredos.
  logUnexpectedError(error);
  return Response.json({ error: "Erro interno", code: "INTERNAL" }, { status: 500 });
}

/** Remove e-mails e valores de query que possam conter tokens/códigos. */
function sanitizeForLog(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (email) => {
      const [local = "", domain = ""] = email.split("@");
      return `${local.slice(0, 2)}***@${domain}`;
    })
    .replace(/((?:token|code|secret|key|password|api[_-]?key)=)[^&\s"']+/gi, "$1[REDACTED]")
    .slice(0, 1200);
}

export function logUnexpectedError(error: unknown): void {
  const details =
    error instanceof Error
      ? {
          name: error.name,
          code:
            "code" in error && typeof error.code === "string"
              ? sanitizeForLog(error.code)
              : undefined,
          message: sanitizeForLog(error.message || String(error)),
          stack: sanitizeForLog(error.stack ?? "")
            .split("\n")
            .slice(0, 6)
            .join("\n"),
        }
      : {
          name: "unknown",
          message: sanitizeForLog(
            (() => {
              try {
                return JSON.stringify(error);
              } catch {
                return String(error);
              }
            })(),
          ),
        };
  console.error("[api] erro não tratado", details);
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
