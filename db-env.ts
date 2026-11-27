import "dotenv/config";

/**
 * URLs de banco derivadas de um único conjunto de componentes.
 *
 *Este arquivo fica na raiz para poder ser usado por `prisma7.config.ts` já no
 *estágio de `dependencies` do Docker, antes de `app/` ser copiado.
 *
 * Se a variável URL correspondente já estiver definida, ela tem precedência —
 * assim produção pode apontar auditoria/backups para outra instância/credenciais
 * sem alterar os componentes usados pelo docker-compose local.
 */

function connectionUrl(name: string): string {
  const host = process.env.DATABASE_HOST?.trim() || "localhost";
  const port = process.env.DATABASE_PORT?.trim() || "5432";
  const user = process.env.DATABASE_USER?.trim() || "";
  const password = process.env.DATABASE_PASS ?? "";
  const auth = user
    ? `${encodeURIComponent(user)}${password ? `:${encodeURIComponent(password)}` : ""}@`
    : "";
  return `postgresql://${auth}${host}:${port}/${name}`;
}

/** Preenche DATABASE_URL, AUDIT_DATABASE_URL e BACKUP_TEST_DATABASE_URL quando ausentes. */
export function ensureDatabaseUrls(): void {
  const name = process.env.DATABASE_NAME?.trim() || "sistema_academico";

  if (!process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = connectionUrl(name);
  }
  if (!process.env.AUDIT_DATABASE_URL?.trim()) {
    process.env.AUDIT_DATABASE_URL = connectionUrl(`${name}_audit`);
  }
  if (!process.env.BACKUP_TEST_DATABASE_URL?.trim()) {
    process.env.BACKUP_TEST_DATABASE_URL = connectionUrl(`${name}_backup_test`);
  }
}

ensureDatabaseUrls();
