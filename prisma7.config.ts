import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` precisa funcionar em CI sem acesso ao banco.
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/sistema_academico",
  },
});
