import "dotenv/config";
import { policyReviewReport } from "../app/lib/security/compliance-service";

async function main() {
  const r = await policyReviewReport(new Date(), "maintenance-cli");
  console.log(
    `Revisão da política (16): última ${r.lastReviewedAt ?? "nunca"}, próxima ${r.nextReviewAt ?? "não agendada"}`,
  );
  console.log(
    `Incidente relevante desde a última: ${r.relevantIncidentSinceLastReview ?? "nenhum"}`,
  );
  console.log(`Atrasada: ${r.overdue}`);
  if (r.overdue) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
