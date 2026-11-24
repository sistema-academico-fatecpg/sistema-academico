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

export const NotifyIncidentSchema = z.object({
  anpd: z.boolean().default(false),
  subjects: z.boolean().default(false),
});
