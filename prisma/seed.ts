import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { ROLE_PERMISSIONS } from "../app/types/roles";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não definida");
}

const db = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN_MASTER: "Coordenação: configura o sistema e aprova operações críticas.",
  ADMIN_SECUNDARIO: "Secretaria: cadastra pessoas e mantém dados acadêmicos.",
  PROFESSOR: "Docente: consulta e lança notas das turmas vinculadas.",
  ALUNO: "Discente: consulta notas e realiza matrícula.",
  AUDITOR: "Auditoria: consulta logs e aprova acessos excepcionais.",
  SUPORTE_TECNICO: "Suporte temporário, sem permissões permanentes.",
};

async function main() {
  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await db.role.upsert({
      where: { name: roleName as keyof typeof ROLE_PERMISSIONS },
      update: { description: ROLE_DESCRIPTIONS[roleName] },
      create: {
        name: roleName as keyof typeof ROLE_PERMISSIONS,
        description: ROLE_DESCRIPTIONS[roleName],
      },
    });

    const permissionIds: string[] = [];
    for (const permission of permissions) {
      const [module, action] = permission.split(":") as [string, string];
      const record = await db.permission.upsert({
        where: { name: permission },
        update: {},
        create: {
          name: permission,
          module: module as never,
          action: action as never,
        },
      });
      permissionIds.push(record.id);
    }

    // Todo perfil nasce sem permissão; as permissões são atribuídas por perfil
    // conforme a matriz de referência (seção 7.1).
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissionIds.length > 0) {
      await db.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
  }

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
