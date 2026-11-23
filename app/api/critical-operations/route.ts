import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { CriticalOperationRequestInputSchema } from "@/lib/validations";
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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ["ADMIN_MASTER", "ADMIN_SECUNDARIO"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as
      | "PENDING"
      | "APPROVED"
      | "REJECTED"
      | "EXECUTED"
      | "CANCELLED"
      | undefined;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;

    const skip = (page - 1) * limit;

    const requests = await criticalOperationRequestRepository.findMany({
      where: {
        ...(status && { status }),
      },
      orderBy: { requestedAt: "desc" },
      skip,
      take: limit,
    });

    const total = await criticalOperationRequestRepository.count({
      ...(status && { status }),
    });

    return successResponse({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError("Erro ao listar operações críticas", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const body = await req.json();
    const validation = validateRequest(CriticalOperationRequestInputSchema, body);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const request = await criticalOperationRequestRepository.create({
      ...validation.data,
      status: "PENDING",
      requestedAt: new Date(),
      requestedByUser: {
        connect: { id: validation.data.requestedBy },
      },
    } as any);

    return successResponse(request, 201);
  } catch (error) {
    logError("Erro ao criar operação crítica", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
