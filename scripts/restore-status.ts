import "dotenv/config";
import { restoreTestReport } from "../app/lib/security/compliance-service";

async function main() {
  const r = await restoreTestReport();
  console.log(
    `Teste de restauração (11.3.4): último ${r.lastRestoreTestAt ?? "nunca"} (intervalo ${r.intervalDays} dias)`,
  );
  console.log(`RPO ${r.rpoHours}h / RTO ${r.rtoHours}h | atrasado: ${r.overdue}`);
  if (r.overdue) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
