import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { forbidden, notFound, validationError } from "@/app/lib/auth/errors";
import { db } from "@/app/lib/db";
import { decryptText, encryptText, maskValue } from "./crypto";

export type SensitiveActor = {
  id: string;
  roles: readonly string[];
  ipAddress: string;
};

export class SensitiveDataService {
  constructor(private readonly audit = createAuditService()) {}

  /** 11.1.2: dado sensível criptografado com AES-256-GCM, nunca em texto puro. */
  async store(actor: SensitiveActor, userId: string, type: string, value: string) {
    // 11.1.3 / LGPD art. 14: menores exigem data de nascimento e consentimento
    // de pelo menos um responsável legal antes de receber dado sensível.
    const profile = await db.studentProfile.findUnique({ where: { userId } });
    if (profile) {
      if (!profile.birthDate) {
        throw validationError(
          "Registre a data de nascimento e o consentimento do responsável antes de armazenar dado sensível de aluno (11.1.3)",
        );
      }
      const age = (Date.now() - profile.birthDate.getTime()) / (365.25 * 86_400_000);
      if (age < 18 && !profile.guardianConsentAt) {
        throw validationError(
          "Consentimento do responsável legal obrigatório para dados de menores (11.1.3)",
        );
      }
    }

    const encrypted = encryptText(value);
    const record = await db.sensitiveData.create({
      data: {
        userId,
        type,
        cipherText: encrypted.cipherText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        createdBy: actor.id,
      },
    });
    await this.audit.record({
      userId: actor.id as never,
      role: (actor.roles[0] ?? null) as never,
      ipAddress: actor.ipAddress,
      action: AUDIT_ACTIONS.SENSITIVE_DATA_STORED,
      module: "USERS",
      recordType: "SensitiveData",
      recordId: record.id,
      result: "SUCCESS",
      newValue: { userId, type },
    });
    return record;
  }

  /** 11.1.2: exibição mascarada do próprio valor, nunca do id do registro. */
  async maskedForUser(userId: string) {
    const records = await db.sensitiveData.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        createdAt: true,
        revealedAt: true,
        cipherText: true,
        iv: true,
        authTag: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => {
      let masked: string;
      try {
        const plaintext = decryptText({
          cipherText: record.cipherText,
          iv: record.iv,
          authTag: record.authTag,
        });
        masked = maskValue(plaintext);
      } catch {
        // Chave indisponível: mantém mascaramento integral, sem revelar nada.
        masked = "••••";
      }
      return {
        id: record.id,
        type: record.type,
        masked,
        revealedAt: record.revealedAt,
      };
    });
  }

  async reveal(actor: SensitiveActor, id: string): Promise<string> {
    if (!actor.roles.includes("ADMIN_MASTER") && !actor.roles.includes("AUDITOR")) {
      throw forbidden("Revelação de dado sensível restrita ao Admin Master e ao Auditor");
    }
    const record = await db.sensitiveData.findUnique({ where: { id } });
    if (!record) throw notFound("Dado sensível não encontrado");
    const value = decryptText({
      cipherText: record.cipherText,
      iv: record.iv,
      authTag: record.authTag,
    });
    await db.sensitiveData.update({ where: { id }, data: { revealedAt: new Date() } });
    await this.audit.record({
      userId: actor.id as never,
      role: (actor.roles[0] ?? null) as never,
      ipAddress: actor.ipAddress,
      action: AUDIT_ACTIONS.SENSITIVE_DATA_REVEALED,
      module: "USERS",
      recordType: "SensitiveData",
      recordId: id,
      result: "SUCCESS",
      newValue: { userId: record.userId, type: record.type },
    });
    return value;
  }
}
