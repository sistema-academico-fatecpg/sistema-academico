import { z } from "zod";
import { UserIdSchema } from "./common";

export const IncidentSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const ReportIncidentSchema = z.object({
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(20).max(5000),
  severity: IncidentSeveritySchema,
  involvesMaster: z.boolean().default(false),
  directionAuthorization: z.string().trim().max(255).optional(),
});

export const ContainIncidentSchema = z.object({
  accountId: UserIdSchema.optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

export const AnalyzeIncidentSchema = z.object({
  analysisReport: z.string().trim().min(20).max(5000),
  backupId: z.string().uuid(),
  affectedRecordIds: z.array(z.string().uuid()).min(1),
  integrityVerified: z.literal(true),
});

export const RequestRestoreSchema = z.object({
  backupId: z.string().uuid(),
  affectedRecordIds: z.array(z.string().uuid()).min(1),
});

/** 13.4: protocolo de comunicação com destinatário, conteúdo e evidência. */
export const NotificationEntrySchema = z.object({
  recipient: z.string().trim().min(3).max(255),
  channel: z.enum(["ANPD", "DATA_SUBJECT", "DPO", "OTHER"]),
  content: z.string().trim().min(5).max(4000),
  deliveryEvidence: z.string().trim().min(3).max(1000),
  sentAt: z.string().datetime().optional(),
});

export const NotifyIncidentSchema = z.object({
  anpd: z.boolean().default(false),
  subjects: z.boolean().default(false),
  protocol: z.array(NotificationEntrySchema).max(50).optional(),
});

/** 13.3: conclusão da restauração (após execução aprovada). */
export const MarkRestoredSchema = z.object({
  backupId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const RecordNotificationProtocolSchema = z.object({
  entries: z.array(NotificationEntrySchema).min(1).max(50),
});
