import "dotenv/config";
import { BackupService } from "../app/lib/security/backup-service";

type BackupType = "FULL" | "INCREMENTAL" | "SEMESTER_CLOSING";

const types: Record<string, BackupType> = {
  full: "FULL",
  incremental: "INCREMENTAL",
  closing: "SEMESTER_CLOSING",
};

async function main() {
  const arg = (process.argv[2] ?? "incremental").toLowerCase();
  const type = types[arg];
  if (!type) throw new Error("Uso: pnpm backup [full|incremental|closing]");
  const record = await new BackupService().create(
    type,
    process.env.BACKUP_OPERATOR ?? "infraestrutura",
  );
  console.log(`Backup ${type} criado e criptografado: ${record.id}`);
  console.log(
    `Destinos: ${record.destinations} · retenção até ${record.retentionUntil.toISOString()}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
