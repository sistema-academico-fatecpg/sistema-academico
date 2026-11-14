import type { NextRequest } from "next/server";
import * as speakeasy from "speakeasy";
import { v4 as uuidv4 } from "uuid";
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

    const user = await userRepository.findUnique({
      id: auth.user.sub,
    } as any);
    if (!user) {
      return errorResponse(ApiErrors.NOT_FOUND("Usuário"));
    }

    if (user.mfaEnabled) {
      return errorResponse(ApiErrors.BAD_REQUEST("MFA já está configurado"));
    }

    const secret = speakeasy.generateSecret({
      name: `Sistema Acadêmico (${user.email})`,
    });

    return successResponse({
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    });
  } catch (error) {
    logError("Erro ao gerar segredo MFA", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) {
      return errorResponse(auth.error);
    }

    const body = await req.json();
    const { token, secret } = body;

    if (!token || !secret) {
      return errorResponse(ApiErrors.BAD_REQUEST("Token e segredo são obrigatórios"));
    }

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      return errorResponse(ApiErrors.BAD_REQUEST("Token inválido"));
    }

    const recoveryCodes = Array.from({ length: 10 }, () => uuidv4().slice(0, 8).toUpperCase());

    for (const code of recoveryCodes) {
      await mfaRecoveryCodeRepository.create({
        userId: auth.user.sub,
        codeHash: code,
      } as any);
    }

    await userRepository.update(
      { id: auth.user.sub } as any,
      {
        mfaEnabled: true,
        mfaSecret: secret,
      } as any,
    );

    return successResponse({
      recoveryCodes,
    });
  } catch (error) {
    logError("Erro ao ativar MFA", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
