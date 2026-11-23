export type AuthErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "INVALID_TOKEN"
  | "ACCOUNT_NOT_ACTIVE"
  | "APPROVAL_REQUIRED";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: AuthErrorCode,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function unauthenticated(message = "Autenticação necessária") {
  return new AuthError(message, "UNAUTHENTICATED", 401);
}

export function forbidden(message = "Acesso não autorizado") {
  return new AuthError(message, "FORBIDDEN", 403);
}

export function conflict(message = "Registro já existente") {
  return new AuthError(message, "CONFLICT", 409);
}

export function notFound(message = "Registro não encontrado") {
  return new AuthError(message, "NOT_FOUND", 404);
}

export function invalidToken(message = "Link inválido, expirado ou já utilizado") {
  return new AuthError(message, "INVALID_TOKEN", 400);
}

export function validationError(message: string, details?: unknown) {
  return new AuthError(message, "VALIDATION", 400, details);
}
