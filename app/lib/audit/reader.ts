import { LogRepository } from "@/app/repositories/log.repository";
import type { AlertFilter, LogFilter } from "@/app/types/log";
import { SeparateAuditStore, separateAuditEnabled } from "./separate-store";

export type AuditReader = {
  findMany(
    filter: LogFilter,
  ): Promise<{ items: unknown[]; total: number; page: number; pageSize: number }>;
  listAlerts(
    filter: AlertFilter,
  ): Promise<{ items: unknown[]; total: number; page: number; pageSize: number }>;
  acknowledgeAlert(id: string): Promise<unknown>;
};

/**
 * Em produção a tela/API do Auditor lê a base isolada; sem AUDIT_DATABASE_URL,
 * usa a base local apenas para desenvolvimento (10.3).
 */
export function auditReader(): AuditReader {
  if (separateAuditEnabled()) return new SeparateAuditStore() as unknown as AuditReader;
  return new LogRepository() as unknown as AuditReader;
}
