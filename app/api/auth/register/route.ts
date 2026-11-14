import { OperationResult, SystemModule } from "@prisma/client";
import type { NextRequest } from "next/server";
import { logError, logInfo } from "@/lib/logger";
import { hashPassword } from "@/lib/password";
import { ApiErrors, errorResponse, successResponse } from "@/lib/response";
import { validateRequest } from "@/lib/validation";
import { UserInputSchema } from "@/lib/validations";
import { logRepository, userRepository } from "@/repositories";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = validateRequest(UserInputSchema, body);
    if (!validation.success) {
      return errorResponse(ApiErrors.VALIDATION(validation.error));
    }

    const { email, institutionalEmail, role, name, socialName, registrationNumber } =
      validation.data;

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return errorResponse(ApiErrors.CONFLICT("Usuário já existe com este email"));
    }

    const existingInstEmail = await userRepository.findByInstitutionalEmail(institutionalEmail);
    if (existingInstEmail) {
      return errorResponse(ApiErrors.CONFLICT("Usuário já existe com este email institucional"));
    }

    const passwordHash = await hashPassword(`${Math.random().toString(36).slice(-12)}A1!`);

    const user = await userRepository.create({
      name,
      socialName: socialName ?? null,
      email,
      institutionalEmail,
      registrationNumber: registrationNumber ?? null,
      role: {
        connect: { name: role },
      },
      status: "PENDING_ACTIVATION",
      passwordHash,
      mfaEnabled: false,
    } as any);

    await logRepository.createLog({
      userId: user.id,
      role: role,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      action: "REGISTER_USER",
      module: SystemModule.USERS,
      recordId: user.id,
      result: OperationResult.SUCCESS,
    });

    logInfo("Usuário registrado", { userId: user.id, email, role });

    return successResponse(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        institutionalEmail: user.institutionalEmail,
        role,
        status: "PENDING_ACTIVATION",
      },
      201,
    );
  } catch (error) {
    logError("Erro ao registrar usuário", error);
    return errorResponse(ApiErrors.INTERNAL_SERVER());
  }
}
