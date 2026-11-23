import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { roleRepository } from "@/repositories";

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
    const auth = await requireRole(req, ["ADMIN_MASTER", "ADMIN_SECUNDARIO"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const roles = await roleRepository.findAllWithPermissions();

    return successResponse(
      roles.map((r) => ({
        id: r.id,
        name: r.name,
        permissions: r.permissions.map((p) => p.permission.name),
      })),
    );
  } catch (error) {
    logError("Erro ao listar roles", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
