import type { SupportAccessStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { SupportAccessGrantInputSchema } from "@/lib/validations";
import { supportAccessGrantRepository, supportAccessModuleRepository } from "@/repositories";

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
    const auth = await requireRole(req, ["AUDITOR", "ADMIN_MASTER", "SUPORTE_TECNICO"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as SupportAccessStatus | undefined;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;

    const skip = (page - 1) * limit;

    const grants = await supportAccessGrantRepository.findMany({
      where: {
        ...(status && { status }),
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await supportAccessGrantRepository.count({
      ...(status && { status }),
    });

    return successResponse({
      grants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError("Erro ao listar acessos de suporte", error);
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
    const validation = validateRequest(SupportAccessGrantInputSchema, body);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const grant = await supportAccessGrantRepository.create({
      ...validation.data,
      status: "PENDING",
      createdAt: new Date(),
      user: {
        connect: { id: validation.data.userId },
      },
      requestedByUser: {
        connect: { id: validation.data.requestedBy },
      },
    } as any);

    if (validation.data.modules.length > 0) {
      await supportAccessModuleRepository.createManyForGrant(grant.id, validation.data.modules);
    }

    return successResponse(grant, 201);
  } catch (error) {
    logError("Erro ao criar acesso de suporte", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
