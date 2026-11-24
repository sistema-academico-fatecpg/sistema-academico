import "dotenv/config";
import { expireEmergencyAccounts } from "../app/lib/auth/emergency-service";

async function main() {
  const count = await expireEmergencyAccounts("maintenance-cli");
  console.log(`Contas Master emergenciais bloqueadas por expiração: ${count}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
