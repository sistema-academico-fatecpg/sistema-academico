import { OperationResult, SystemModule } from "@prisma/client";
import type { NextRequest } from "next/server";
import { signToken } from "@/lib/jwt";
import { logError, logInfo } from "@/lib/logger";
import { verifyPassword } from "@/lib/password";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { LoginSchema } from "@/lib/validations";
import { logRepository, userRepository } from "@/repositories";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = validateRequest(LoginSchema, body);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const { email, password } = validation.data;

    const user = await userRepository.findByEmail(email);
    if (!user) {
      logWarn("Tentativa de login com email não cadastrado", { email });
      return errorResponse(ApiErrors.UNAUTHORIZED("Credenciais inválidas"));
    }

    if (user.status === "BLOCKED") {
      logWarn("Tentativa de login em conta bloqueada", { email });
      return errorResponse(ApiErrors.FORBIDDEN("Conta bloqueada"));
    }

    if (user.status === "PENDING_ACTIVATION") {
      return errorResponse(ApiErrors.FORBIDDEN("Conta não ativada. Verifique seu email."));
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      await logRepository.createLog({
        userId: user.id,
        role: user.role?.name || "UNKNOWN",
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        action: "LOGIN_FAILED",
        module: SystemModule.USERS,
        result: OperationResult.FAILURE,
      });
      return errorResponse(ApiErrors.UNAUTHORIZED("Credenciais inválidas"));
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role?.name || "UNKNOWN",
    });

    await logRepository.createLog({
      userId: user.id,
      role: user.role?.name || "UNKNOWN",
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "LOGIN_SUCCESS",
      module: SystemModule.USERS,
      result: OperationResult.SUCCESS,
    });

    logInfo("Login realizado com sucesso", { userId: user.id, email });

    return successResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        institutionalEmail: user.institutionalEmail,
        role: user.role,
        status: user.status,
      },
      token,
    });
  } catch (error) {
    logError("Erro no login", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}

function logWarn(message: string, meta?: Record<string, unknown>) {
  console.warn(`[WARN] ${message}`, meta ?? "");
}
