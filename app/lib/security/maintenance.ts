import { timingSafeEqual } from "node:crypto";
import { AuthError } from "@/app/lib/auth/errors";

/**
 * Rotinas de implantação/contingência são restritas à Equipe de Infraestrutura
 * por segredo fora da aplicação (seções 8.1 e 8.8). Nenhum desenvolvedor deve
 * possuir credencial no ambiente de produção (7.4).
 */
export function assertMaintenanceSecret(request: Request): void {
  const expected = process.env.MAINTENANCE_SECRET;
  const provided = request.headers.get("x-maintenance-secret") ?? "";
  if (!expected || expected.length < 16) {
    throw new AuthError("Rotina indisponível", "FORBIDDEN", 403);
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AuthError("Rotina indisponível", "FORBIDDEN", 403);
  }
}
