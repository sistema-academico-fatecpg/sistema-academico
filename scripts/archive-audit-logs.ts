import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { recordMaintenanceIntervention } from "../app/lib/audit/maintenance-trail";

/**
 * 10.7/10.9: arquivamento após o prazo de guarda SEM ler nem alterar o
 * conteúdo dos registros. Gera um plano de `DETACH PARTITION` por mês expirado
 * para a Infraestrutura executar na base de auditoria. Nenhuma linha de log é
 * consultada; apenas o calendário é usado.
 */
const ACCESS_LOG_RETENTION_DAYS = 365;

function expiredMonths(now: Date): string[] {
  const cutoff = new Date(now.getTime() - ACCESS_LOG_RETENTION_DAYS * 86_400_000);
  const months: string[] = [];
  const cursor = new Date(Date.UTC(2020, 0, 1));
  while (cursor < cutoff) {
    const year = cursor.getUTCFullYear();
    const month = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    months.push(`logs_${year}_${month}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

async function main() {
  const now = new Date();
  const partitions = expiredMonths(now);
  const plan = [
    "-- Plano de arquivamento de logs de acesso (10.7/10.9).",
    "-- Executar na base ISOLADA de auditoria, pela Infraestrutura.",
    "-- Nenhum conteúdo de log é lido ou alterado por esta rotina.",
    `-- Gerado em ${now.toISOString()} | retenção ${ACCESS_LOG_RETENTION_DAYS} dias.`,
    "",
    ...partitions.map(
      (name) => `ALTER TABLE audit_logs DETACH PARTITION ${name}; -- mover para armazenamento frio`,
    ),
    "",
  ].join("\n");

  const dir = process.env.AUDIT_ARCHIVE_DIR?.trim() || "/tmp/opencode/audit-archive";
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `archive-plan-${now.toISOString().slice(0, 10)}.sql`);
  await writeFile(file, plan, "utf8");

  await recordMaintenanceIntervention("AUDIT_ARCHIVE_PLAN", "maintenance-cli", {
    partitions: partitions.length,
    planFile: file,
  });
  console.log(`Plano de arquivamento gerado: ${file}`);
  console.log(`Partições elegíveis: ${partitions.length} (conteúdo não lido)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
