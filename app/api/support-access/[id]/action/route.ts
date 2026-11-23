import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { UUIDSchema } from "@/lib/validations";
import { supportAccessGrantRepository } from "@/repositories";

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
    const auth = await requireRole(req, ["AUDITOR", "ADMIN_MASTER"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const idValidation = validateRequest(UUIDSchema, params.id);
    if (!idValidation.success) {
      return errorResponse(ApiErrors.VALIDATION(idValidation.error));
    }

    const body = await req.json();
    const action = body.action as "APPROVE" | "REJECT" | "REVOKE" | "EXPIRE";

    const grant = await supportAccessGrantRepository.findUnique({
      id: idValidation.data,
    } as any);
    if (!grant) {
      return errorResponse(ApiErrors.NOT_FOUND("Acesso de suporte"));
    }

    let updatedGrant;
    switch (action) {
      case "APPROVE":
        updatedGrant = await supportAccessGrantRepository.approve(idValidation.data, auth.user.sub);
        break;
      case "REJECT":
        updatedGrant = await supportAccessGrantRepository.reject(idValidation.data, auth.user.sub);
        break;
      case "REVOKE":
        updatedGrant = await supportAccessGrantRepository.revoke(idValidation.data);
        break;
      case "EXPIRE":
        updatedGrant = await supportAccessGrantRepository.expire(idValidation.data);
        break;
      default:
        return errorResponse(ApiErrors.BAD_REQUEST("Ação inválida"));
    }

    return successResponse(updatedGrant);
  } catch (error) {
    logError("Erro ao processar acesso de suporte", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
