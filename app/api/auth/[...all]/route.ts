import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/app/lib/auth/better-auth";

const handler = toNextJsHandler(auth);

/**
 * 8.3/8.6: senha nunca é definida por autoatendimento nem por administrador.
 * Os endpoints públicos do Better Auth para redefinição/troca de senha são
 * desativados aqui (404), sem alterar nenhum outro endpoint da biblioteca.
 * A ativação e a redefinição passam pelo AccountService, que valida a política
 * de senhas, exige o código de e-mail e registra auditoria.
 */
const SELF_SERVICE_PASSWORD_PATHS = new Set([
  "request-password-reset",
  "reset-password",
  "change-password",
]);

function isBlockedPasswordEndpoint(request: Request): boolean {
  try {
    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    return SELF_SERVICE_PASSWORD_PATHS.has((segments.at(-1) ?? "").toLowerCase());
  } catch {
    return false;
  }
}

function guarded(method: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    if (isBlockedPasswordEndpoint(request)) return new Response(null, { status: 404 });
    return method(request);
  };
}

export const GET = guarded(handler.GET);
export const POST = guarded(handler.POST);
export const PATCH = guarded(handler.PATCH);
export const PUT = guarded(handler.PUT);
export const DELETE = guarded(handler.DELETE);
