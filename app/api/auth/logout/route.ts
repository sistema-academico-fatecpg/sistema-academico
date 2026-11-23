import { OperationResult, SystemModule } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logInfo } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { logRepository } from "@/repositories";

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return errorResponse(ApiErrors.UNAUTHORIZED("Não autenticado"));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return errorResponse(ApiErrors.UNAUTHORIZED("Token inválido"));
    }

    await logRepository.createLog({
      userId: payload.sub,
      role: payload.role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "LOGOUT",
      module: SystemModule.USERS,
      result: OperationResult.SUCCESS,
    });

    logInfo("Logout realizado", { userId: payload.sub });

    return successResponse({ message: "Logout realizado com sucesso" });
  } catch (_error) {
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
