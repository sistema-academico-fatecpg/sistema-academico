import "dotenv/config";
import { BackupService } from "../app/lib/security/backup-service";

async function main() {
  const [backupId, requestId, ...affected] = process.argv.slice(2);
  if (!backupId || !requestId || affected.length === 0) {
    throw new Error(
      "Uso: pnpm restore <backup-id> <request-id> <record-id> [record-id...]\n" +
        "O request-id deve ser uma DATA_RESTORE_AFTER_INCIDENT com status EXECUTED.",
    );
  }
  const result = await new BackupService().partialRestore(backupId, affected, requestId);
  console.log(`Restauração parcial concluída: ${result.restored} registro(s).`);
  console.log("Estado anterior preservado em backup INCREMENTAL (13.3).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
