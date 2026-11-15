import { OperationResult, SystemModule } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { gradeRepository, logRepository } from "@/repositories";
import { GradeInputSchema } from "@/types/academic";

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

    const grades = await gradeRepository.findMany({
      orderBy: { recordedAt: "desc" },
    });

    return successResponse(grades);
  } catch (error) {
    logError("Erro listar notas", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const body = await req.json();
    const validation = validateRequest(GradeInputSchema, body);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const grade = await gradeRepository.create(validation.data as any);

    await logRepository.createLog({
      userId: auth.user.sub,
      role: auth.user.role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "CREATE_GRADE",
      module: SystemModule.GRADES,
      recordId: grade.id,
      result: OperationResult.SUCCESS,
    });

    return successResponse(grade, 201);
  } catch (error) {
    logError("Erro criar nota", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
