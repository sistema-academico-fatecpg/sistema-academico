import "dotenv/config";
import { closeExpiredGradePeriods } from "../app/lib/academic/grade-closing-service";

async function main() {
  const count = await closeExpiredGradePeriods("maintenance-cli");
  console.log(`Períodos de notas fechados automaticamente: ${count}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
