import "dotenv/config";
import { BackupService } from "../app/lib/security/backup-service";

async function main() {
  const count = await new BackupService().expireRetention(new Date(), "maintenance-cli");
  console.log(`Cópias fora da retenção marcadas como EXPIRED: ${count}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
