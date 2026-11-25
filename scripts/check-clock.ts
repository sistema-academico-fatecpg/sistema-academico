import "dotenv/config";
import { clockDriftReport } from "../app/lib/security/compliance-service";

async function main() {
  const report = await clockDriftReport();
  console.log(
    `Relógio (10.1): deriva ${report.driftSeconds ?? "?"}s (máx. ${report.maxDriftSeconds}s)`,
  );
  console.log(
    `Aplicação: ${report.applicationTime} | Banco: ${report.databaseTime ?? "indisponível"}`,
  );
  if (!report.compliant) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
