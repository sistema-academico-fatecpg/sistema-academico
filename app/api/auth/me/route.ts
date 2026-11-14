import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { userRepository } from "@/repositories";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return errorResponse(ApiErrors.UNAUTHORIZED("Não autenticado"));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return errorResponse(ApiErrors.UNAUTHORIZED("Token inválido"));
    }

    const user = await userRepository.findUnique({
      id: payload.sub,
    } as any);

    if (!user) {
      return errorResponse(ApiErrors.NOT_FOUND("Usuário"));
    }

    return successResponse({
      id: user.id,
      name: user.name,
      socialName: user.socialName,
      email: user.email,
      institutionalEmail: user.institutionalEmail,
      registrationNumber: user.registrationNumber,
      role: user.role,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
    });
  } catch (error) {
    logError("Erro ao buscar perfil", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
