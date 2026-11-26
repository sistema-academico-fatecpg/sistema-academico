import "dotenv/config";
import { bootstrapMaster } from "../app/lib/auth/bootstrap";

async function main() {
  const name = process.env.BOOTSTRAP_MASTER_NAME?.trim();
  // Este valor é o e-mail PESSOAL do titular: o institucional é gerado.
  const personalEmail = process.env.BOOTSTRAP_MASTER_EMAIL?.trim().toLowerCase();

  if (!name || !personalEmail) {
    throw new Error(
      "Defina BOOTSTRAP_MASTER_NAME e BOOTSTRAP_MASTER_EMAIL (e-mail pessoal) para criar a primeira conta Admin Master",
    );
  }

  const user = await bootstrapMaster({ name, personalEmail, ipAddress: "bootstrap-cli" });
  // Loga apenas o institucional; o e-mail pessoal não aparece em console.
  console.log(`Conta Admin Master criada sem senha: ${user.email}`);
  console.log("O link de ativação (24h) foi enviado; a senha será definida pelo titular.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
