import { OperationResult, SystemModule } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError, logInfo } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { UUIDSchema } from "@/lib/validations";
import { logRepository, userRepository } from "@/repositories";

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
    const auth = await requireRole(req, ["ADMIN_MASTER", "ADMIN_SECUNDARIO"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const validation = validateRequest(UUIDSchema, params.id);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const user = await userRepository.findUnique({
      id: validation.data,
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    logError("Erro ao buscar usuário", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRole(req, ["ADMIN_MASTER", "ADMIN_SECUNDARIO"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const validation = validateRequest(UUIDSchema, params.id);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const body = await req.json();
    const { role, ...updateData } = body;

    const updateDataWithRole: any = { ...updateData };
    if (role) {
      updateDataWithRole.role = { connect: { name: role } };
    }

    const existingUser = await userRepository.findUnique({
      id: validation.data,
    } as any);
    if (!existingUser) {
      return errorResponse(ApiErrors.NOT_FOUND("Usuário"));
    }

    const updatedUser = await userRepository.update(
      { id: validation.data } as any,
      updateDataWithRole,
    );

    await logRepository.createLog({
      userId: auth.user.sub,
      role: auth.user.role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "UPDATE_USER",
      module: SystemModule.USERS,
      recordId: validation.data,
      result: OperationResult.SUCCESS,
      newValue: updateDataWithRole,
    });

    logInfo("Usuário atualizado", { userId: validation.data, updatedBy: auth.user.sub });

    return successResponse({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      status: updatedUser.status,
    });
  } catch (error) {
    logError("Erro ao atualizar usuário", error);
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

    const existingUser = await userRepository.findUnique({
      id: validation.data,
    } as any);
    if (!existingUser) {
      return errorResponse(ApiErrors.NOT_FOUND("Usuário"));
    }

    if (existingUser.role?.name === "ADMIN_MASTER") {
      return errorResponse(ApiErrors.FORBIDDEN("Não é possível excluir um Admin Master"));
    }

    await userRepository.update(
      { id: validation.data } as any,
      {
        status: "INACTIVE",
        deactivatedAt: new Date(),
        deactivatedBy: auth.user.sub,
      } as any,
    );

    await logRepository.createLog({
      userId: auth.user.sub,
      role: auth.user.role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "DEACTIVATE_USER",
      module: SystemModule.USERS,
      recordId: validation.data,
      result: OperationResult.SUCCESS,
    });

    return successResponse({ message: "Usuário desativado com sucesso" });
  } catch (error) {
    logError("Erro ao desativar usuário", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
