import { createHash } from "node:crypto";
import type { LogRepository } from "@/app/repositories/log.repository";
import type { AlertType, RoleName, SystemModule } from "@/app/types/common";
import type { LogInput } from "@/app/types/log";
import { redactSensitiveData } from "./redact";
import { SeparateAuditStore, separateAuditEnabled } from "./separate-store";

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
  ACCOUNT_UPDATED: "ACCOUNT_UPDATED",
  ACCOUNT_ACTIVATED: "ACCOUNT_ACTIVATED",
  ACCOUNT_BLOCKED: "ACCOUNT_BLOCKED",
  ACCOUNT_DEACTIVATED: "ACCOUNT_DEACTIVATED",
  ACCOUNT_ACTIVATION_RESENT: "ACCOUNT_ACTIVATION_RESENT",
  SECOND_FACTOR_CONFIGURED: "SECOND_FACTOR_CONFIGURED",
  SECOND_FACTOR_RESET: "SECOND_FACTOR_RESET",
  SECOND_FACTOR_RECOVERY_USED: "SECOND_FACTOR_RECOVERY_USED",
  SENSITIVE_DATA_STORED: "SENSITIVE_DATA_STORED",
  SENSITIVE_DATA_REVEALED: "SENSITIVE_DATA_REVEALED",
  DATA_SUBJECT_REQUESTED: "DATA_SUBJECT_REQUESTED",
  DATA_SUBJECT_COMPLETED: "DATA_SUBJECT_COMPLETED",
  GUARDIAN_CONSENT_RECORDED: "GUARDIAN_CONSENT_RECORDED",
  BACKUP_CREATED: "BACKUP_CREATED",
  BACKUP_FAILED: "BACKUP_FAILED",
  BACKUP_RESTORE_TESTED: "BACKUP_RESTORE_TESTED",
  INCIDENT_REPORTED: "INCIDENT_REPORTED",
  INCIDENT_CONTAINED: "INCIDENT_CONTAINED",
  INCIDENT_ANALYZED: "INCIDENT_ANALYZED",
  INCIDENT_RESTORE_REQUESTED: "INCIDENT_RESTORE_REQUESTED",
  INCIDENT_NOTIFIED: "INCIDENT_NOTIFIED",
  INCIDENT_CLOSED: "INCIDENT_CLOSED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  EMAIL_CONFIRMED: "EMAIL_CONFIRMED",
  ROLE_ASSIGNED: "ROLE_ASSIGNED",
  ROLE_REMOVED: "ROLE_REMOVED",
  ROLE_CREATED: "ROLE_CREATED",
  PERMISSIONS_CHANGED: "PERMISSIONS_CHANGED",
  ADMIN_ACCESS_REPORT_VIEWED: "ADMIN_ACCESS_REPORT_VIEWED",
  MAINTENANCE_INTERVENTION: "MAINTENANCE_INTERVENTION",
  EMERGENCY_MASTER_REVIEWED: "EMERGENCY_MASTER_REVIEWED",
  INCIDENT_NOTIFICATION_LATE: "INCIDENT_NOTIFICATION_LATE",
  CRITICAL_OPERATION_REQUESTED: "CRITICAL_OPERATION_REQUESTED",
  CRITICAL_OPERATION_APPROVED: "CRITICAL_OPERATION_APPROVED",
  CRITICAL_OPERATION_REJECTED: "CRITICAL_OPERATION_REJECTED",
  CRITICAL_OPERATION_EXECUTED: "CRITICAL_OPERATION_EXECUTED",
  SELF_APPROVAL_ATTEMPT: "SELF_APPROVAL_ATTEMPT",
  ACADEMIC_RECORD_CREATED: "ACADEMIC_RECORD_CREATED",
  ACADEMIC_RECORD_UPDATED: "ACADEMIC_RECORD_UPDATED",
  ACADEMIC_RECORD_DELETED: "ACADEMIC_RECORD_DELETED",
  ACADEMIC_PERIOD_CREATED: "ACADEMIC_PERIOD_CREATED",
  GRADES_PERIOD_UPDATED: "GRADES_PERIOD_UPDATED",
  GRADES_PERIOD_CLOSED: "GRADES_PERIOD_CLOSED",
  GRADE_CHANGED: "GRADE_CHANGED",
  GRADE_CHANGE_OUTSIDE_PERIOD: "GRADE_CHANGE_OUTSIDE_PERIOD",
  GRADE_CORRECTION_REQUESTED: "GRADE_CORRECTION_REQUESTED",
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
  CLOCK_DRIFT_DETECTED: "CLOCK_DRIFT_DETECTED",
  KEY_ROTATION_CHECKED: "KEY_ROTATION_CHECKED",
  BACKUP_MEDIA_CHECKED: "BACKUP_MEDIA_CHECKED",
  POLICY_REVIEW_RECORDED: "POLICY_REVIEW_RECORDED",
  POLICY_VIOLATION_RECORDED: "POLICY_VIOLATION_RECORDED",
  DPO_NOTIFICATION_DUE: "DPO_NOTIFICATION_DUE",
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
  INCIDENT_REPORTED: "INCIDENT_REPORTED",
  DATA_SUBJECT_REQUESTED: "DATA_SUBJECT_REQUESTED",
  BACKUP_FAILED: "BACKUP_FAILED",
  CLOCK_DRIFT_DETECTED: "CLOCK_DRIFT",
  DPO_NOTIFICATION_DUE: "DPO_NOTIFICATION_DUE",
};

const LOGIN_FAILURE_ALERT_THRESHOLD = 3;
const LOGIN_FAILURE_WINDOW_MINUTES = 15;

/**
 * Identificador de login (e-mail informado) reduzido a um resumo estável: nunca
 * persistimos o valor bruto, que pode conter dados pessoais ou segredos (10.5).
 * O valor já sanitizado é idempotente para chamadas repetidas.
 */
export function sanitizeLoginIdentifier(identifier: string | null | undefined): string | null {
  const value = identifier?.trim().toLowerCase();
  if (!value) return null;
  if (value.startsWith("sha256:")) return value;
  return `sha256:${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

export class AuditService {
  constructor(
    private readonly repository: LogRepository,
    private readonly notifier?: AlertNotifier,
    /** Base separada e append-only (10.3); ausente apenas em desenvolvimento. */
    private readonly mirror: SeparateAuditStore | null = separateAuditEnabled()
      ? new SeparateAuditStore()
      : null,
  ) {}

  /**
   * Grava um registro imutável. O conteúdo sensível é removido antes da
   * persistência, inclusive em campos aninhados.
   */
  async record(event: AuditEvent) {
    // Todas as ações de uma conta Master emergencial ficam marcadas (8.8.3).
    const emergencyCheck = (this.repository as Partial<LogRepository>).isEmergencyUser;
    const emergency =
      event.userId && typeof emergencyCheck === "function"
        ? await emergencyCheck.call(this.repository, event.userId)
        : false;

    const redactedNewValue = redactSensitiveData(event.newValue);
    const loginFailed = event.action === AUDIT_ACTIONS.LOGIN_FAILED;
    // Falhas de conta inexistente também são registradas e alertadas: o
    // identificador é sanitizado ANTES de qualquer persistência (10.5).
    const rawIdentifier =
      loginFailed && redactedNewValue && typeof redactedNewValue === "object"
        ? (redactedNewValue as { identifier?: unknown }).identifier
        : undefined;
    const identifier =
      typeof rawIdentifier === "string" ? sanitizeLoginIdentifier(rawIdentifier) : null;
    const newValue =
      loginFailed &&
      rawIdentifier !== undefined &&
      redactedNewValue &&
      typeof redactedNewValue === "object"
        ? { ...(redactedNewValue as Record<string, unknown>), identifier }
        : redactedNewValue;

    const sanitized: AuditEvent = {
      ...event,
      emergency,
      oldValue: redactSensitiveData(event.oldValue),
      newValue,
    };

    const log = await this.repository.append(sanitized);
    // Espelha na base isolada antes de qualquer alerta. Sem AUDIT_DATABASE_URL,
    // o espelho é nulo e vale apenas a base local de desenvolvimento.
    await this.mirror?.append(sanitized);

    if (loginFailed) {
      await this.alertLoginFailureSequence(
        (event.userId ?? null) as string | null,
        event.ipAddress,
        identifier,
      );
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
    await this.mirror?.createAlert(type, message, metadata, logId);
    await this.notifier?.({ type, message, metadata });
    return alert;
  }

  private async alertLoginFailureSequence(
    userId: string | null,
    ipAddress: string,
    identifier: string | null,
  ) {
    const since = new Date(Date.now() - LOGIN_FAILURE_WINDOW_MINUTES * 60_000);
    const failures = userId
      ? await this.repository.countRecentFailures(userId, since)
      : await this.countRecentFailuresByIdentifier(identifier, ipAddress, since);
    if (failures < LOGIN_FAILURE_ALERT_THRESHOLD) return;

    const loginFailureMetadata = redactSensitiveData({ userId, identifier, ipAddress, failures });
    await this.repository.createAlert(
      "LOGIN_FAILURE_SEQUENCE",
      `Sequência de ${failures} falhas de login em ${LOGIN_FAILURE_WINDOW_MINUTES} minutos.`,
      loginFailureMetadata,
    );
    await this.mirror?.createAlert(
      "LOGIN_FAILURE_SEQUENCE",
      `Sequência de ${failures} falhas de login em ${LOGIN_FAILURE_WINDOW_MINUTES} minutos.`,
      loginFailureMetadata,
    );
  }

  /**
   * Conta falhas de contas inexistente pelo identificador sanitizado (e IP), já
   * que não há userId para a consulta indexada. Repositórios mínimos de teste
   * que não expõem `findMany` usam a contagem genérica disponível.
   */
  private async countRecentFailuresByIdentifier(
    identifier: string | null,
    ipAddress: string,
    since: Date,
  ): Promise<number> {
    const repository = this.repository as Partial<LogRepository>;
    if (typeof repository.findMany !== "function") {
      return this.repository.countRecentFailures(identifier ?? "unknown", since);
    }

    const { items } = await repository.findMany.call(this.repository, {
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      module: "USERS",
      result: "FAILURE",
      from: since.toISOString(),
      page: 1,
      pageSize: 200,
    });
    return items.filter((item) => {
      if (ipAddress && item.ipAddress !== ipAddress) return false;
      const stored = (item.newValue as { identifier?: unknown } | null)?.identifier ?? null;
      return stored === identifier;
    }).length;
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
    case "INCIDENT_REPORTED":
      return "Incidente de segurança registrado; Admin Master e Auditor devem ser comunicados.";
    case "DATA_SUBJECT_REQUESTED":
      return "Titular solicitou exercício de direito LGPD (art. 18).";
    case "BACKUP_FAILED":
      return "Falha na rotina de cópia de segurança.";
    case "DPO_NOTIFICATION_DUE":
      return "Incidente com risco relevante: DPO deve notificar ANPD e titulares em até 3 dias úteis.";
    case "CLOCK_DRIFT":
      return "Deriva entre relógio da aplicação e do banco; verificar NTP (10.1).";
    case "KEY_ROTATION_OVERDUE":
      return "Rotação anual da chave de criptografia vencida (11.2.4).";
    case "BACKUP_MEDIA_OVERDUE":
      return "Mídia física de backup com mais de 3 anos ou sem desconexão registrada (11.3.2).";
    case "POLICY_REVIEW_OVERDUE":
      return "Revisão anual da Política de Segurança vencida (16).";
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

/**
 * Extrai os três campos de identificação repetidos em dezenas de chamadas a
 * `audit.record`. Aceita tanto o `AuthenticatedUser` (id/roles) quanto o
 * `ActorContext` legado (actorId/actorRoles).
 */
export function auditActor(actor: {
  id?: string | null;
  actorId?: string | null;
  roles?: readonly string[];
  actorRoles?: readonly string[];
  ipAddress: string;
}): Pick<AuditEvent, "userId" | "role" | "ipAddress"> {
  const userId = actor.id ?? actor.actorId ?? null;
  const roles = actor.roles ?? actor.actorRoles ?? [];
  return {
    userId: (userId ?? null) as AuditEvent["userId"],
    role: (roles[0] ?? null) as AuditEvent["role"],
    ipAddress: actor.ipAddress,
  };
}

export function auditModule(module: SystemModule): SystemModule {
  return module;
}
