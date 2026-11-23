import { OperationResult, SystemModule } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { UUIDSchema } from "@/lib/validations";
import { courseRepository, logRepository } from "@/repositories";

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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const validation = validateRequest(UUIDSchema, params.id);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const course = await courseRepository.findUnique({
      id: validation.data,
    } as any);

    if (!course) {
      return errorResponse(ApiErrors.NOT_FOUND("Curso"));
    }

    return successResponse(course);
  } catch (error) {
    logError("Erro ao buscar curso", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRole(req, ["ADMIN_MASTER"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const validation = validateRequest(UUIDSchema, params.id);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const body = await req.json();
    const existingCourse = await courseRepository.findUnique({
      id: validation.data,
    } as any);
    if (!existingCourse) {
      return errorResponse(ApiErrors.NOT_FOUND("Curso"));
    }

    const updatedCourse = await courseRepository.update(
      { id: validation.data } as any,
      body as any,
    );

    await logRepository.createLog({
      userId: auth.user.sub,
      role: auth.user.role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "UPDATE_COURSE",
      module: SystemModule.COURSES,
      recordId: validation.data,
      result: OperationResult.SUCCESS,
    });

    return successResponse(updatedCourse);
  } catch (error) {
    logError("Erro ao atualizar curso", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRole(req, ["ADMIN_MASTER"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const validation = validateRequest(UUIDSchema, params.id);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const existingCourse = await courseRepository.findUnique({
      id: validation.data,
    } as any);
    if (!existingCourse) {
      return errorResponse(ApiErrors.NOT_FOUND("Curso"));
    }

    await courseRepository.delete({ id: validation.data } as any);

    await logRepository.createLog({
      userId: auth.user.sub,
      role: auth.user.role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "DELETE_COURSE",
      module: SystemModule.COURSES,
      recordId: validation.data,
      result: OperationResult.SUCCESS,
    });

    return successResponse({ message: "Curso excluído com sucesso" });
  } catch (error) {
    logError("Erro ao excluir curso", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
