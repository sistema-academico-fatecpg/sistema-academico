import type { LogRepository } from "@/app/repositories/log.repository";
import type { AlertType, RoleName, SystemModule } from "@/app/types/common";
import type { LogInput } from "@/app/types/log";
import { redactSensitiveData } from "./redact";

export type AuditEvent = LogInput;

export type AlertNotifier = (alert: {
  type: AlertType;
  message: string;
  metadata?: unknown;
}) => Promise<void> | void;

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGIN_BLOCKED: "LOGIN_BLOCKED",
  LOGOUT: "LOGOUT",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  ACCOUNT_CREATED: "ACCOUNT_CREATED",
  ACCOUNT_ACTIVATED: "ACCOUNT_ACTIVATED",
  ACCOUNT_BLOCKED: "ACCOUNT_BLOCKED",
  ACCOUNT_DEACTIVATED: "ACCOUNT_DEACTIVATED",
  ROLE_ASSIGNED: "ROLE_ASSIGNED",
  ROLE_REMOVED: "ROLE_REMOVED",
  PERMISSIONS_CHANGED: "PERMISSIONS_CHANGED",
  CRITICAL_OPERATION_REQUESTED: "CRITICAL_OPERATION_REQUESTED",
  CRITICAL_OPERATION_APPROVED: "CRITICAL_OPERATION_APPROVED",
  CRITICAL_OPERATION_REJECTED: "CRITICAL_OPERATION_REJECTED",
  CRITICAL_OPERATION_EXECUTED: "CRITICAL_OPERATION_EXECUTED",
  SELF_APPROVAL_ATTEMPT: "SELF_APPROVAL_ATTEMPT",
  GRADE_CHANGED: "GRADE_CHANGED",
  GRADE_CHANGE_OUTSIDE_PERIOD: "GRADE_CHANGE_OUTSIDE_PERIOD",
  ENROLLMENT_CREATED: "ENROLLMENT_CREATED",
  ENROLLMENT_EXCEPTION_REQUESTED: "ENROLLMENT_EXCEPTION_REQUESTED",
  EXPORT: "EXPORT",
  MASS_EXPORT: "MASS_EXPORT",
  AUDIT_LOG_VIEWED: "AUDIT_LOG_VIEWED",
  SUPPORT_ACCESS_REQUESTED: "SUPPORT_ACCESS_REQUESTED",
  SUPPORT_ACCESS_APPROVED: "SUPPORT_ACCESS_APPROVED",
  SUPPORT_ACCESS_REJECTED: "SUPPORT_ACCESS_REJECTED",
  SUPPORT_ACCESS_CONSULTED: "SUPPORT_ACCESS_CONSULTED",
  MASTER_ACCOUNTS_BELOW_MINIMUM: "MASTER_ACCOUNTS_BELOW_MINIMUM",
  EMERGENCY_MASTER_CREATED: "EMERGENCY_MASTER_CREATED",
  EMERGENCY_MASTER_EXPIRED: "EMERGENCY_MASTER_EXPIRED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

const ALERT_BY_ACTION: Partial<Record<string, AlertType>> = {
  PERMISSIONS_CHANGED: "PERMISSION_CHANGED",
  GRADE_CHANGE_OUTSIDE_PERIOD: "GRADE_CHANGE_OUTSIDE_PERIOD",
  MASS_EXPORT: "MASS_EXPORT",
  SELF_APPROVAL_ATTEMPT: "SELF_APPROVAL_ATTEMPT",
  MASTER_ACCOUNTS_BELOW_MINIMUM: "MASTER_ACCOUNTS_BELOW_MINIMUM",
  SUPPORT_ACCESS_CONSULTED: "SUPPORT_ACCESS_USED",
  EMERGENCY_MASTER_CREATED: "EMERGENCY_MASTER_ACCOUNT",
};

const LOGIN_FAILURE_ALERT_THRESHOLD = 3;
const LOGIN_FAILURE_WINDOW_MINUTES = 15;

export class AuditService {
  constructor(
    private readonly repository: LogRepository,
    private readonly notifier?: AlertNotifier,
  ) {}

  /**
   * Grava um registro imutável. O conteúdo sensível é removido antes da
   * persistência, inclusive em campos aninhados.
   */
  async record(event: AuditEvent) {
    const sanitized: AuditEvent = {
      ...event,
      oldValue: redactSensitiveData(event.oldValue),
      newValue: redactSensitiveData(event.newValue),
    };

    const log = await this.repository.append(sanitized);

    if (event.userId && event.action === AUDIT_ACTIONS.LOGIN_FAILED) {
      await this.alertLoginFailureSequence(event.userId, event.ipAddress);
    }

    const alertType = ALERT_BY_ACTION[event.action];
    if (alertType) {
      await this.raiseAlert(alertType, event, log.id);
    }

    return log;
  }

  async raiseAlert(type: AlertType, event: AuditEvent, logId?: string) {
    const message = alertMessage(type, event);
    const metadata = redactSensitiveData({
      action: event.action,
      module: event.module,
      recordType: event.recordType,
      recordId: event.recordId,
      userId: event.userId,
      ipAddress: event.ipAddress,
    });
    const alert = await this.repository.createAlert(type, message, metadata, logId);
    await this.notifier?.({ type, message, metadata });
    return alert;
  }

  private async alertLoginFailureSequence(userId: string, ipAddress: string) {
    const since = new Date(Date.now() - LOGIN_FAILURE_WINDOW_MINUTES * 60_000);
    const failures = await this.repository.countRecentFailures(userId, since);
    if (failures < LOGIN_FAILURE_ALERT_THRESHOLD) return;

    await this.repository.createAlert(
      "LOGIN_FAILURE_SEQUENCE",
      `Sequência de ${failures} falhas de login em ${LOGIN_FAILURE_WINDOW_MINUTES} minutos.`,
      redactSensitiveData({ userId, ipAddress, failures }),
    );
  }
}

function alertMessage(type: AlertType, event: AuditEvent): string {
  switch (type) {
    case "PERMISSION_CHANGED":
      return "Permissões de perfil foram alteradas.";
    case "LOGIN_FAILURE_SEQUENCE":
      return "Sequência de falhas de login detectada.";
    case "GRADE_CHANGE_OUTSIDE_PERIOD":
      return "Tentativa de alteração de nota fora do período permitido.";
    case "MASS_EXPORT":
      return "Exportação em massa de dados pessoais solicitada.";
    case "SELF_APPROVAL_ATTEMPT":
      return "Tentativa de autoaprovação de operação crítica.";
    case "MASTER_ACCOUNTS_BELOW_MINIMUM":
      return "Menos de duas contas Admin Master ativas.";
    case "SUPPORT_ACCESS_USED":
      return "Consulta realizada por acesso excepcional de Suporte Técnico.";
    case "EMERGENCY_MASTER_ACCOUNT":
      return "Conta Master emergencial criada ou utilizada.";
    default:
      return `Evento de auditoria: ${event.action}`;
  }
}

export function auditContext(input: {
  userId?: string | null;
  role?: RoleName | null;
  ipAddress: string;
}): Pick<AuditEvent, "userId" | "role" | "ipAddress"> {
  return {
    userId: (input.userId ?? null) as AuditEvent["userId"],
    role: input.role ?? null,
    ipAddress: input.ipAddress,
  };
}

export function auditModule(module: SystemModule): SystemModule {
  return module;
}
