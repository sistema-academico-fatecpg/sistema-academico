import "dotenv/config";
import { adminAccessReport } from "../app/lib/audit/admin-access-report";

async function main() {
  const report = await adminAccessReport();
  console.log(`Relatório semestral de acessos administrativos (8.7.3)`);
  console.log(`Período: ${report.periodStart} a ${report.periodEnd}`);
  console.log(`Eventos: ${report.totalEvents}`);
  for (const row of report.byUser) {
    console.log(`- ${row.userId ?? "anon"} (${row.role ?? "—"}): ${row.events} evento(s)`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
