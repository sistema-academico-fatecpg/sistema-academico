import { OperationResult, SystemModule } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { logRepository } from "@/repositories";

async function requireAuth(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return { error: ApiErrors.UNAUTHORIZED() };
  }
  const user = verifyToken(token);
  if (!user) {
    return { error: ApiErrors.UNAUTHORIZED("Token inválido") };
  }
  return { user };
}

async function requireRole(req: NextRequest, allowedRoles: string[]) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return auth;
  }
  if (!allowedRoles.includes(auth.user.role)) {
    return { error: ApiErrors.FORBIDDEN("Permissão insuficiente") };
  }
  return { user: auth.user };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ["AUDITOR", "ADMIN_MASTER"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 50;
    const module = searchParams.get("module");
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");

    const skip = (page - 1) * limit;

    const logs = await logRepository.findMany({
      where: {
        ...(module && { module: module as SystemModule }),
        ...(action && { action }),
        ...(userId && { userId }),
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await logRepository.count({
      ...(module && { module: module as SystemModule }),
      ...(action && { action }),
      ...(userId && { userId }),
    });

    await logRepository.createLog({
      userId: auth.user.sub,
      role: auth.user.role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "VIEW_LOGS",
      module: SystemModule.AUDIT_LOGS,
      result: OperationResult.SUCCESS,
    });

    return successResponse({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError("Erro ao listar logs", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
