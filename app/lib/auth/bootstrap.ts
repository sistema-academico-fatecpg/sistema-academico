import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { db } from "@/app/lib/db";
import { UserRepository } from "@/app/repositories/user.repository";
import type { InstitucionalEmail, UserId } from "@/app/types/common";
import { AccountService } from "./account-service";
import { conflict } from "./errors";

export type BootstrapMasterInput = {
  name: string;
  email: InstitucionalEmail;
  ipAddress?: string;
};

/**
 * Rotina de implantação (seção 8.1.1): cria a primeira conta Admin Master sem
 * senha, em status PENDING_ACTIVATION, e dispara o link de ativação.
 *
 * A rotina é idempotente: se já existir qualquer usuário, não cria nada. Isso
 * impede que uma instalação em uso seja reinicializada por engano.
 */
export async function bootstrapMaster(input: BootstrapMasterInput) {
  const ipAddress = input.ipAddress ?? "bootstrap";
  const existingUsers = await db.user.count();
  if (existingUsers > 0) {
    throw conflict("A rotina de implantação só pode ser executada em uma instalação vazia");
  }

  const users = new UserRepository();
  const accountService = new AccountService();
  const audit = createAuditService();

  const user = await users.create({
    name: input.name,
    email: input.email,
    role: "ADMIN_MASTER",
    createdBy: null,
  });

  await accountService.sendActivation(user, ipAddress);

  await audit.record({
    userId: user.id as UserId,
    role: "ADMIN_MASTER",
    ipAddress,
    action: AUDIT_ACTIONS.ACCOUNT_CREATED,
    module: "USERS",
    recordType: "User",
    recordId: user.id,
    result: "SUCCESS",
    newValue: { name: user.name, email: user.email, role: "ADMIN_MASTER", origin: "bootstrap" },
  });

  return user;
}
