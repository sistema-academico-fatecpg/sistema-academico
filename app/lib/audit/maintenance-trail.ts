import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";

/**
 * 10.9: cada intervenção técnica da Infraestrutura na base de logs é
 * registrada em trilha própria, sem leitura nem alteração do conteúdo.
 */
export async function recordMaintenanceIntervention(
  operation: string,
  ipAddress: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  await createAuditService().record({
    userId: null,
    role: null,
    ipAddress,
    action: AUDIT_ACTIONS.MAINTENANCE_INTERVENTION,
    module: "AUDIT_LOGS",
    recordType: "Maintenance",
    result: "SUCCESS",
    newValue: { operation, ...details },
  });
}
