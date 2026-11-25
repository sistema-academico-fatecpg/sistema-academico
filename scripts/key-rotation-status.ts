import "dotenv/config";
import { keyRotationReport } from "../app/lib/security/compliance-service";

async function main() {
  const r = await keyRotationReport(new Date(), "maintenance-cli");
  console.log(
    `Rotação da chave (11.2.4): última ${r.rotatedAt ?? "nunca"}, ${r.daysSinceRotation ?? "?"} dias`,
  );
  console.log(
    `Custodiantes válidos: ${r.custodiansValid} | Nuvem MFA/imutável: ${r.cloud.mfa}/${r.cloud.immutable}`,
  );
  console.log(`Conforme: ${r.compliant}`);
  if (!r.compliant) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
