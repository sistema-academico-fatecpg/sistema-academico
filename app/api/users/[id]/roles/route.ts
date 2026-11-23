import { OperationResult, SystemModule } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError, logInfo } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { RoleNameSchema, UUIDSchema } from "@/lib/validations";
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRole(req, ["ADMIN_MASTER"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const userValidation = validateRequest(UUIDSchema, params.id);
    if (!userValidation.success) {
      return errorResponse(ApiErrors.VALIDATION(userValidation.error));
    }

    const body = await req.json();
    const roleValidation = validateRequest(RoleNameSchema, body.role);
    if (!roleValidation.success) {
      return errorResponse(ApiErrors.VALIDATION(roleValidation.error));
    }

    const existingUser = await userRepository.findUnique({
      id: userValidation.data,
    } as any);
    if (!existingUser) {
      return errorResponse(ApiErrors.NOT_FOUND("Usuário"));
    }

    const hasRole = await userRepository.hasRole(userValidation.data, roleValidation.data);
    if (hasRole) {
      return errorResponse(ApiErrors.CONFLICT("Usuário já possui este papel"));
    }

    await userRepository.assignRole(userValidation.data, roleValidation.data);

    await logRepository.createLog({
      userId: auth.user.sub,
      role: auth.user.role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "ASSIGN_ROLE",
      module: SystemModule.USERS,
      recordId: userValidation.data,
      result: OperationResult.SUCCESS,
      newValue: { role: roleValidation.data },
    });

    logInfo("Role atribuído", {
      userId: userValidation.data,
      role: roleValidation.data,
      assignedBy: auth.user.sub,
    });

    return successResponse({
      message: "Papel atribuído com sucesso",
    });
  } catch (error) {
    logError("Erro ao atribuir papel", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; roleName: string } },
) {
  try {
    const auth = await requireRole(req, ["ADMIN_MASTER"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const userValidation = validateRequest(UUIDSchema, params.id);
    if (!userValidation.success) {
      return errorResponse(ApiErrors.VALIDATION(userValidation.error));
    }

    const roleValidation = validateRequest(RoleNameSchema, params.roleName);
    if (!roleValidation.success) {
      return errorResponse(ApiErrors.VALIDATION(roleValidation.error));
    }

    const existingUser = await userRepository.findUnique({
      id: userValidation.data,
    } as any);
    if (!existingUser) {
      return errorResponse(ApiErrors.NOT_FOUND("Usuário"));
    }

    const hasRole = await userRepository.hasRole(userValidation.data, roleValidation.data);
    if (!hasRole) {
      return errorResponse(ApiErrors.CONFLICT("Usuário não possui este papel"));
    }

    await userRepository.removeRole(userValidation.data, roleValidation.data);

    await logRepository.createLog({
      userId: auth.user.sub,
      role: auth.user.role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "REMOVE_ROLE",
      module: SystemModule.USERS,
      recordId: userValidation.data,
      result: OperationResult.SUCCESS,
    });

    return successResponse({
      message: "Papel removido com sucesso",
    });
  } catch (error) {
    logError("Erro ao remover papel", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
