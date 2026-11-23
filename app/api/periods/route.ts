import { OperationResult, SystemModule } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { logRepository, periodRepository } from "@/repositories";
import { PeriodInputSchema } from "@/types/academic";

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
    const auth = await requireAuth(req);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const periods = await periodRepository.findMany({
      orderBy: { name: "asc" },
    });

    return successResponse(periods);
  } catch (error) {
    logError("Erro listar períodos", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ["ADMIN_MASTER"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const body = await req.json();
    const validation = validateRequest(PeriodInputSchema, body);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const existing = await periodRepository.findByCode(validation.data.code);
    if (existing) {
      return errorResponse(ApiErrors.CONFLICT("Código de período já existe"));
    }

    const period = await periodRepository.create(validation.data as any);

    await logRepository.createLog({
      userId: auth.user.sub,
      role: auth.user.role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "CREATE_PERIOD",
      module: SystemModule.PERIODS,
      recordId: period.id,
      result: OperationResult.SUCCESS,
    });

    return successResponse(period, 201);
  } catch (error) {
    logError("Erro criar período", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
