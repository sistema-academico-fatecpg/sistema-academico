import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { ApprovalActionSchema, UUIDSchema } from "@/lib/validations";
import { criticalOperationRequestRepository } from "@/repositories";

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

    const idValidation = validateRequest(UUIDSchema, params.id);
    if (!idValidation.success) {
      return errorResponse(ApiErrors.VALIDATION(idValidation.error));
    }

    const body = await req.json();
    const actionValidation = validateRequest(ApprovalActionSchema, body);
    if (!actionValidation.success) {
      return errorResponse(ApiErrors.VALIDATION(actionValidation.error));
    }

    const request = await criticalOperationRequestRepository.findUnique({
      id: idValidation.data,
    } as any);
    if (!request) {
      return errorResponse(ApiErrors.NOT_FOUND("Operação crítica"));
    }

    if (request.status !== "PENDING") {
      return errorResponse(ApiErrors.BAD_REQUEST("Operação já foi processada"));
    }

    if (request.requestedBy === auth.user.sub) {
      return errorResponse(ApiErrors.FORBIDDEN("Não é possível aprovar a própria solicitação"));
    }

    let updatedRequest;
    switch (actionValidation.data.action) {
      case "APPROVE":
        updatedRequest = await criticalOperationRequestRepository.approve(
          idValidation.data,
          auth.user.sub,
        );
        break;
      case "REJECT":
        updatedRequest = criticalOperationRequestRepository.reject(
          idValidation.data,
          auth.user.sub,
        );
        break;
      case "EXECUTE":
        updatedRequest = criticalOperationRequestRepository.execute(idValidation.data);
        break;
      case "CANCEL":
        updatedRequest = criticalOperationRequestRepository.cancel(idValidation.data);
        break;
    }

    return successResponse(updatedRequest);
  } catch (error) {
    logError("Erro ao processar operação crítica", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
