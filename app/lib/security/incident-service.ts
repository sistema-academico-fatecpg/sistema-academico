import type { z } from "zod";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { AccountService } from "@/app/lib/auth/account-service";
import { conflict, forbidden, notFound, validationError } from "@/app/lib/auth/errors";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { db } from "@/app/lib/db";
import { addBusinessDays, isOverdue } from "@/app/lib/security/business-days";
import type {
  AnalyzeIncidentSchema,
  ContainIncidentSchema,
  MarkRestoredSchema,
  NotificationEntrySchema,
  NotifyIncidentSchema,
  RecordNotificationProtocolSchema,
  ReportIncidentSchema,
  RequestRestoreSchema,
} from "@/app/types/incident";
import { BackupService } from "./backup-service";

export type IncidentActor = {
  id: string;
  roles: readonly string[];
  ipAddress: string;
  permissions?: ReadonlySet<string>;
};

type Report = z.infer<typeof ReportIncidentSchema>;
type Contain = z.infer<typeof ContainIncidentSchema>;
type Analyze = z.infer<typeof AnalyzeIncidentSchema>;
type Restore = z.infer<typeof RequestRestoreSchema>;
type Notify = z.infer<typeof NotifyIncidentSchema>;
type MarkRestored = z.infer<typeof MarkRestoredSchema>;
type ProtocolEntry = z.infer<typeof NotificationEntrySchema>;
type NotificationProtocol = z.infer<typeof RecordNotificationProtocolSchema>;

/** Prazos e responsabilidades do fluxo de incidentes (seção 13). */
export const INCIDENT_NOTIFICATION_BUSINESS_DAYS = 3;
export const INCIDENT_RETENTION_YEARS = 5;

const INCIDENT_RESTORED_ACTION = "INCIDENT_RESTORED";
const NOTIFICATION_PROTOCOL_ACTION = "INCIDENT_NOTIFICATION_PROTOCOL_RECORDED";

function withRecordedBy(entries: ProtocolEntry[], actorId: string) {
  return entries.map((entry) => ({
    ...entry,
    sentAt: entry.sentAt ?? new Date().toISOString(),
    recordedBy: actorId,
  }));
}

export class IncidentService {
  constructor(
    private readonly backups = new BackupService(),
    private readonly criticalOperations = new CriticalOperationService(),
    private readonly accounts = new AccountService(),
    private readonly audit = createAuditService(),
  ) {}

  private async find(id: string) {
    const incident = await db.incident.findUnique({ where: { id } });
    if (!incident) throw notFound("Incidente não encontrado");
    return incident;
  }

  private assertAdminOrAuditor(actor: IncidentActor): void {
    if (!actor.roles.includes("ADMIN_MASTER") && !actor.roles.includes("AUDITOR")) {
      throw forbidden("Fluxo de incidente restrito ao Admin Master e ao Auditor");
    }
  }

  private event(actor: IncidentActor, action: string, id: string, value: unknown) {
    return this.audit.record({
      ...auditActor(actor),
      action,
      module: "BACKUPS",
      recordType: "Incident",
      recordId: id,
      result: "SUCCESS",
      newValue: value,
    });
  }

  /** 13.1: comunicação imediata e preservação de evidências. */
  async report(actor: IncidentActor, input: Report) {
    this.assertAdminOrAuditor(actor);
    if (input.involvesMaster && !input.directionAuthorization) {
      throw validationError("Incidente com Admin Master exige autorização formal da direção");
    }
    const incident = await db.incident.create({
      data: {
        title: input.title,
        description: input.description,
        severity: input.severity,
        status: "REPORTED",
        reportedBy: actor.id,
        directionAuthorization: input.directionAuthorization ?? null,
        evidence: input.involvesMaster ? { involvesMaster: true } : undefined,
      },
    });
    await this.event(actor, AUDIT_ACTIONS.INCIDENT_REPORTED, incident.id, {
      severity: input.severity,
      involvesMaster: input.involvesMaster,
    });
    // 13 / LGPD art. 48: risco relevante dispara alerta ao DPO e ao Auditor.
    if (input.severity === "HIGH" || input.severity === "CRITICAL") {
      await this.audit.record({
        ...auditActor(actor),
        action: AUDIT_ACTIONS.DPO_NOTIFICATION_DUE,
        module: "BACKUPS",
        recordType: "Incident",
        recordId: incident.id,
        result: "SUCCESS",
        newValue: {
          severity: input.severity,
          deadline: addBusinessDays(incident.reportedAt, 3).toISOString(),
        },
      });
    }
    return incident;
  }

  async contain(actor: IncidentActor, id: string, input: Contain) {
    this.assertAdminOrAuditor(actor);
    const incident = await this.find(id);
    if (incident.status !== "REPORTED") throw conflict("Incidente já em andamento");
    if (input.accountId) {
      await this.accounts.block(input.accountId, `Contenção do incidente ${id}`, {
        actorId: actor.id,
        actorRoles: actor.roles as never,
        ipAddress: actor.ipAddress,
      });
    }
    const updated = await db.incident.update({
      where: { id },
      data: {
        status: "CONTAINED",
        containedBy: actor.id,
        containedAt: new Date(),
        evidence: (input.evidence ?? {}) as never,
      },
    });
    await this.event(actor, AUDIT_ACTIONS.INCIDENT_CONTAINED, id, {
      blockedAccount: input.accountId ?? null,
    });
    return updated;
  }

  /** 13.2: análise técnica e verificação de integridade do backup. */
  async analyze(actor: IncidentActor, id: string, input: Analyze) {
    this.assertAdminOrAuditor(actor);
    const incident = await this.find(id);
    const backup = await db.backupRecord.findUnique({ where: { id: input.backupId } });
    if (!backup) throw notFound("Cópia de segurança não encontrada");
    if (backup.createdAt.getTime() >= incident.reportedAt.getTime()) {
      throw conflict("A cópia escolhida deve ser anterior ao incidente (13.2)");
    }
    if (!backup.restoreTestAt) {
      throw conflict(
        "A cópia deve ser testada em ambiente separado antes de ir para produção (13.2)",
      );
    }
    await this.backups.verify(input.backupId);
    const updated = await db.incident.update({
      where: { id },
      data: {
        status: "ANALYZED",
        analysisReport: input.analysisReport,
        backupId: input.backupId,
        affectedRecordIds: input.affectedRecordIds as never,
        analyzedAt: new Date(),
      },
    });
    await this.event(actor, AUDIT_ACTIONS.INCIDENT_ANALYZED, id, {
      backupId: input.backupId,
      affected: input.affectedRecordIds.length,
    });
    return updated;
  }

  /** 13.2: restauração nunca é automática; gera solicitação de dupla aprovação. */
  async requestRestore(actor: IncidentActor, id: string, input: Restore) {
    this.assertAdminOrAuditor(actor);
    // 13.2: a solicitação é do Admin Master; a aprovação é do Auditor/direção.
    if (!actor.roles.includes("ADMIN_MASTER")) {
      throw forbidden("A solicitação de restauração cabe ao Admin Master (13.2)");
    }
    const incident = await this.find(id);
    if (incident.status !== "ANALYZED") {
      throw conflict("Restauração exige análise técnica concluída");
    }
    const involvesMaster = Boolean(
      incident.evidence &&
        typeof incident.evidence === "object" &&
        (incident.evidence as Record<string, unknown>).involvesMaster,
    );
    const request = await this.criticalOperations.request(
      {
        id: actor.id,
        roles: actor.roles as never,
        ipAddress: actor.ipAddress,
        permissions: actor.permissions as never,
      },
      {
        operation: "DATA_RESTORE_AFTER_INCIDENT",
        module: "BACKUPS",
        recordType: "Incident",
        recordId: id,
        reason: `Restauração parcial autorizada no incidente ${id}`,
        authorizationDocument: incident.directionAuthorization ?? undefined,
        payload: {
          backupId: input.backupId,
          incidentId: id,
          affectedRecordIds: input.affectedRecordIds,
          involvesMaster,
          authorizationDocument: incident.directionAuthorization ?? null,
        },
      },
    );
    await db.incident.update({ where: { id }, data: { status: "RESTORE_REQUESTED" } });
    await this.event(actor, AUDIT_ACTIONS.INCIDENT_RESTORE_REQUESTED, id, {
      requestId: request.id,
    });
    return { requestId: request.id };
  }

  /**
   * 13.3: registra a conclusão da restauração (restoredAt), preservando a
   * exigência de solicitação aprovada e executada em dupla aprovação.
   */
  async markRestored(actor: IncidentActor, id: string, input: MarkRestored) {
    this.assertAdminOrAuditor(actor);
    const incident = await this.find(id);
    if (incident.status !== "RESTORE_REQUESTED" && incident.status !== "RESTORED") {
      throw conflict("Registro de restauração exige análise e solicitação aprovada (13.2)");
    }
    if (incident.status === "RESTORE_REQUESTED") {
      const executed = await db.criticalOperationRequest.findFirst({
        where: {
          recordId: id,
          operation: "DATA_RESTORE_AFTER_INCIDENT",
          status: "EXECUTED",
        },
        select: { id: true },
      });
      if (!executed)
        throw conflict("A restauração ainda não foi executada após a aprovação (13.2)");
    }
    const restoredAt = incident.restoredAt ?? new Date();
    const updated = await db.incident.update({
      where: { id },
      data: {
        status: "RESTORED",
        restoredAt,
        ...(input.backupId ? { backupId: input.backupId } : {}),
      },
    });
    await this.event(actor, INCIDENT_RESTORED_ACTION, id, {
      restoredAt: restoredAt.toISOString(),
      backupId: input.backupId ?? incident.backupId ?? null,
      notes: input.notes ?? null,
    });
    return updated;
  }

  /** 13.4: protocolo de comunicação com destinatário, conteúdo e evidência. */
  async recordNotificationProtocol(actor: IncidentActor, id: string, input: NotificationProtocol) {
    this.assertAdminOrAuditor(actor);
    const incident = await this.find(id);
    if (incident.status === "CLOSED") {
      throw conflict("Incidente encerrado não aceita novos registros de notificação");
    }
    const entries = withRecordedBy(input.entries, actor.id);
    const previous = Array.isArray(incident.notificationProtocol)
      ? (incident.notificationProtocol as unknown[])
      : [];
    const updated = await db.incident.update({
      where: { id },
      data: { notificationProtocol: [...previous, ...entries] as never },
    });
    await this.event(actor, NOTIFICATION_PROTOCOL_ACTION, id, {
      count: entries.length,
      recipients: entries.map((entry) => entry.recipient),
      channels: entries.map((entry) => entry.channel),
    });
    return updated;
  }

  /** 13 / LGPD art. 48: comunicação em até 3 dias úteis, se houver risco. */
  async notify(actor: IncidentActor, id: string, input: Notify) {
    this.assertAdminOrAuditor(actor);
    const incident = await this.find(id);
    const now = new Date();
    const deadline = addBusinessDays(incident.reportedAt, INCIDENT_NOTIFICATION_BUSINESS_DAYS);
    const late = isOverdue(deadline, now);
    const previous = Array.isArray(incident.notificationProtocol)
      ? (incident.notificationProtocol as unknown[])
      : [];
    const entries = input.protocol?.length ? withRecordedBy(input.protocol, actor.id) : [];
    const updated = await db.incident.update({
      where: { id },
      data: {
        status: "NOTIFIED",
        notifiedAnpdAt: input.anpd ? now : null,
        notifiedSubjectsAt: input.subjects ? now : null,
        ...(entries.length ? { notificationProtocol: [...previous, ...entries] as never } : {}),
      },
    });
    await this.event(actor, AUDIT_ACTIONS.INCIDENT_NOTIFIED, id, {
      anpd: input.anpd,
      subjects: input.subjects,
      protocolEntries: entries.map((entry) => ({
        recipient: entry.recipient,
        channel: entry.channel,
        deliveryEvidence: entry.deliveryEvidence,
      })),
      deadline: deadline.toISOString(),
      late,
    });
    if (late) {
      await this.audit.record({
        ...auditActor(actor),
        action: AUDIT_ACTIONS.INCIDENT_NOTIFICATION_LATE,
        module: "BACKUPS",
        recordType: "Incident",
        recordId: id,
        result: "FAILURE",
        newValue: { deadline: deadline.toISOString(), notifiedAt: now.toISOString() },
      });
    }
    return { incident: updated, deadline: deadline.toISOString(), late };
  }

  async close(actor: IncidentActor, id: string) {
    this.assertAdminOrAuditor(actor);
    await this.find(id);
    const updated = await db.incident.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    await this.event(actor, AUDIT_ACTIONS.INCIDENT_CLOSED, id, {
      retentionYears: INCIDENT_RETENTION_YEARS,
    });
    return updated;
  }
}
