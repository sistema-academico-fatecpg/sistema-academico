import { NextResponse } from "next/server";

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function errorResponse(error: ApiError) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    },
    { status: error.statusCode }
  );
}

export const ApiErrors = {
  NOT_FOUND: (resource: string): ApiError => ({
    code: "NOT_FOUND",
    message: `${resource} não encontrado`,
    statusCode: 404,
  }),
  UNAUTHORIZED: (message = "Não autorizado"): ApiError => ({
    code: "UNAUTHORIZED",
    message,
    statusCode: 401,
  }),
  FORBIDDEN: (message = "Acesso negado"): ApiError => ({
    code: "FORBIDDEN",
    message,
    statusCode: 403,
  }),
  BAD_REQUEST: (message = "Requisição inválida"): ApiError => ({
    code: "BAD_REQUEST",
    message,
    statusCode: 400,
  }),
  CONFLICT: (message = "Conflito"): ApiError => ({
    code: "CONFLICT",
    message,
    statusCode: 409,
  }),
  INTERNAL_SERVER: (message = "Erro interno do servidor"): ApiError => ({
    code: "INTERNAL_SERVER_ERROR",
    message,
    statusCode: 500,
  }),
  VALIDATION: (details: Record<string, unknown>): ApiError => ({
    code: "VALIDATION_ERROR",
    message: "Erro de validação",
    statusCode: 400,
    details,
  }),
};
