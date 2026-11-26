import "dotenv/config";
import { Client } from "pg";

/**
 * Cria os bancos isolados de auditoria e de teste de backup antes das migrações.
 * Necessário também em volumes já existentes, onde os scripts de init do
 * Postgres não são executados novamente.
 */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL não definida");

  const url = new URL(databaseUrl);
  const mainDatabase = decodeURIComponent(url.pathname.replace(/^\//, ""));
  url.pathname = "/postgres";

  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    for (const suffix of ["audit", "backup_test"]) {
      const name = `${mainDatabase}_${suffix}`;
      const found = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
      if (found.rowCount) continue;
      const quoted = name.replace(/"/g, '""');
      await client.query(`CREATE DATABASE "${quoted}"`);
      console.log(`Banco auxiliar criado: ${name}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Falha ao preparar bancos auxiliares:",
    error instanceof Error ? error.message : "erro desconhecido",
  );
  process.exitCode = 1;
});
