import { LogRepository } from "@/app/repositories/log.repository";
import { type AlertNotifier, AuditService } from "./audit-service";

export type { AlertNotifier, AuditAction, AuditEvent } from "./audit-service";
export { AUDIT_ACTIONS, AuditService, auditContext, auditModule } from "./audit-service";
export { redactSensitiveData, redactText } from "./redact";

export function createAuditService(notifier?: AlertNotifier): AuditService {
  return new AuditService(new LogRepository(), notifier);
}
