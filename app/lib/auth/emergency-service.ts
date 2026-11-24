import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { UserRepository } from "@/app/repositories/user.repository";

/**
 * Encerra contas Master emergenciais cujo prazo de até 30 dias terminou
 * (seção 8.8.3): bloqueio lógico, revogação de sessões e invalidação de links.
 */
export async function expireEmergencyAccounts(ipAddress = "maintenance"): Promise<number> {
  const users = new UserRepository();
  const audit = createAuditService();
  const expired = await users.listExpiredEmergencyAccounts();

  for (const account of expired) {
    await users.block(
      account.id,
      "system:emergency-expiry",
      "Conta Master emergencial expirada (validade máxima de 30 dias)",
    );
    await audit.record({
      userId: account.id as never,
      role: "ADMIN_MASTER",
      ipAddress,
      action: AUDIT_ACTIONS.EMERGENCY_MASTER_EXPIRED,
      module: "USERS",
      recordType: "User",
      recordId: account.id,
      result: "SUCCESS",
      newValue: { emergencyExpiresAt: account.emergencyExpiresAt?.toISOString() ?? null },
    });
  }

  return expired.length;
}
