import { OperationResult, SystemModule } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError, logInfo } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { UserInputSchema } from "@/lib/validations";
import { logRepository, userRepository } from "@/repositories";

async function getCurrentUser(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return null;
  }
  return verifyToken(token);
}

async function requireAuth(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return { error: ApiErrors.UNAUTHORIZED() };
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
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const users = await userRepository.findMany({
      where: {
        ...(role && { role: role as any }),
        ...(status && { status: status as any }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { institutionalEmail: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await userRepository.count({
      ...(role && { role: role as any }),
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { institutionalEmail: { contains: search, mode: "insensitive" } },
        ],
      }),
    });

    await logRepository.createLog({
      userId: auth.user.sub,
      role: auth.user.role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "LIST_USERS",
      module: SystemModule.USERS,
      result: OperationResult.SUCCESS,
    });

    return successResponse({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError("Erro ao listar usuários", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ["ADMIN_MASTER", "ADMIN_SECUNDARIO"]);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const body = await req.json();
    const validation = validateRequest(UserInputSchema, body);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const { email, institutionalEmail, role, ...rest } = validation.data;

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return errorResponse(ApiErrors.CONFLICT("Usuário já existe com este email"));
    }

    const existingInstEmail = await userRepository.findByInstitutionalEmail(institutionalEmail);
    if (existingInstEmail) {
      return errorResponse(ApiErrors.CONFLICT("Usuário já existe com este email institucional"));
    }

    const user = await userRepository.create({
      ...rest,
      email,
      institutionalEmail,
      role: {
        connect: { name: role },
      },
      status: "PENDING_ACTIVATION",
      passwordHash: "",
      mfaEnabled: false,
    });

    await logRepository.createLog({
      userId: auth.user.sub,
      role: auth.user.role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "CREATE_USER",
      module: SystemModule.USERS,
      recordId: user.id,
      result: OperationResult.SUCCESS,
      newValue: { email, role, status: "PENDING_ACTIVATION" },
    });

    logInfo("Usuário criado", { userId: user.id, email, role, createdBy: auth.user.sub });

    return successResponse(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        institutionalEmail: user.institutionalEmail,
        role,
        status: user.status,
      },
      201,
    );
  } catch (error) {
    logError("Erro ao criar usuário", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
