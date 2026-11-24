import "dotenv/config";
import { auditRetentionReport } from "../app/lib/audit/retention-service";

async function main() {
  console.log(JSON.stringify(await auditRetentionReport(), null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
