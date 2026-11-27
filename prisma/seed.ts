import "../app/lib/env/database";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { syncRolesAndPermissions } from "./seed-roles";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não definida");
}

const db = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function main() {
  await syncRolesAndPermissions(db);
  console.log("Perfis e permissões sincronizados.");
}

main()
  .catch((error) => {
    console.error("Falha ao executar o seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
