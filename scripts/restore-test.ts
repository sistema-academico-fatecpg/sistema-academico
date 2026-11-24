import "dotenv/config";
import { BackupService } from "../app/lib/security/backup-service";

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error("Uso: pnpm restore:test <backup-id>");
  const record = await new BackupService().restoreTest(id);
  console.log(`Teste de restauração concluído: ${record.id} (${record.status})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
