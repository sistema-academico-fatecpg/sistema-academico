import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/jwt";
import { logError } from "@/lib/logger";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { mfaRecoveryCodeRepository, userRepository } from "@/repositories";

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

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return errorResponse(ApiErrors.BAD_REQUEST("Código de recuperação é obrigatório"));
    }

    const user = await userRepository.findUnique({
      id: auth.user.sub,
    } as any);
    if (!user) {
      return errorResponse(ApiErrors.NOT_FOUND("Usuário"));
    }

    if (!user.mfaEnabled) {
      return errorResponse(ApiErrors.BAD_REQUEST("MFA não está configurado"));
    }

    const recoveryCodes = await mfaRecoveryCodeRepository.findUnusedByUser(auth.user.sub);
    const matchingCode = recoveryCodes.find((rc) => rc.codeHash === code);

    if (!matchingCode) {
      return errorResponse(ApiErrors.BAD_REQUEST("Código de recuperação inválido ou já utilizado"));
    }

    await mfaRecoveryCodeRepository.markAsUsed(matchingCode.id);

    return successResponse({
      message: "Código de recuperação validado. Você pode agora configurar novo MFA.",
    });
  } catch (error) {
    logError("Erro ao validar código de recuperação MFA", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
