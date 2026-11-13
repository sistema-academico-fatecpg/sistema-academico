import { Prisma } from "@/app/generated/prisma/client";

export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "FOREIGN_KEY" | "VALIDATION" | "UNKNOWN",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "RepositoryError";
  }
}

/**
 * Converte erros do Prisma em erros de domínio sem expor detalhes técnicos ao
 * usuário final (seção 12.7).
 */
export function mapPrismaError(error: unknown): RepositoryError {
  if (error instanceof RepositoryError) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return new RepositoryError("Registro já existente", "CONFLICT", { cause: error });
      case "P2003":
        return new RepositoryError("Registro relacionado não encontrado", "FOREIGN_KEY", {
          cause: error,
        });
      case "P2025":
        return new RepositoryError("Registro não encontrado", "NOT_FOUND", { cause: error });
      case "P2000":
        return new RepositoryError("Valor maior que o permitido", "VALIDATION", { cause: error });
      default:
        return new RepositoryError("Erro ao acessar o banco de dados", "UNKNOWN", { cause: error });
    }
  }

  return new RepositoryError("Erro inesperado ao acessar o banco de dados", "UNKNOWN", {
    cause: error,
  });
}

export async function withRepositoryErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapPrismaError(error);
  }
}
