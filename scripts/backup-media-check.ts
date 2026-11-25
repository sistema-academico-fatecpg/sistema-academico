import "dotenv/config";
import { backupMediaReport } from "../app/lib/security/compliance-service";

async function main() {
  const r = await backupMediaReport(new Date(), "maintenance-cli");
  console.log(
    `Mídias de backup (11.3.2): ${r.items.length} | vencidas/sem desconexão: ${r.overdueCount} (máx. ${r.maxYears} anos)`,
  );
  for (const m of r.items)
    console.log(
      `- ${m.label}: ${m.ageYears} anos, desconectada=${m.disconnected}, overdue=${m.overdue}`,
    );
  if (r.overdueCount > 0) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
