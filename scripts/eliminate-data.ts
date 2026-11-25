import "dotenv/config";
import { DataSubjectService } from "../app/lib/security/data-subject-service";

/**
 * 11.1.6: eliminação ao fim do tratamento. A instituição identifica o fim do
 * vínculo e executa esta rotina; o acervo acadêmico e os logs são preservados.
 */
async function main() {
  const userId = process.argv[2];
  const justification = process.argv.slice(3).join(" ");
  if (!userId || justification.length < 10) {
    throw new Error('Uso: pnpm data:eliminate <user-id> "<justificativa com >=10 caracteres>"');
  }
  await new DataSubjectService().eliminate(userId, {
    id: "system:data-retention",
    roles: ["ADMIN_MASTER"],
    ipAddress: "maintenance-cli",
  });
  console.log(`Dados pessoais de ${userId} eliminados; acervo e logs preservados.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
