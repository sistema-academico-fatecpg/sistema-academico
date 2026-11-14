import type { NextRequest } from "next/server";
import { logError } from "@/lib/logger";
import { hashPassword } from "@/lib/password";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { UUIDSchema } from "@/lib/validations";
import { tokenRepository, userRepository } from "@/repositories";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateRequest(UUIDSchema, body.tokenId);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const token = await tokenRepository.findByTokenHash(validation.data);
    if (!token) {
      return errorResponse(ApiErrors.NOT_FOUND("Token"));
    }

    if (token.expiresAt < new Date()) {
      return errorResponse(ApiErrors.BAD_REQUEST("Token expirado"));
    }

    if (token.usedAt) {
      return errorResponse(ApiErrors.BAD_REQUEST("Token já utilizado"));
    }

    if (token.purpose !== "PASSWORD_RESET") {
      return errorResponse(ApiErrors.BAD_REQUEST("Token inválido para esta operação"));
    }

    const user = await userRepository.findUnique({
      id: token.userId,
    } as any);
    if (!user) {
      return errorResponse(ApiErrors.NOT_FOUND("Usuário"));
    }

    const newPassword = `${Math.random().toString(36).slice(-12)}A1!`;
    const passwordHash = await hashPassword(newPassword);

    await userRepository.update(
      { id: user.id } as any,
      {
        passwordHash,
      } as any,
    );

    await tokenRepository.markAsUsed(token.id);

    return successResponse({
      message:
        "Senha redefinida com sucesso. Sua nova senha temporária é: " +
        newPassword +
        ". Por favor, altere-a no primeiro login.",
    });
  } catch (error) {
    logError("Erro ao redefinir senha", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
