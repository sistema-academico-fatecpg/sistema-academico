import type { PrismaClient } from "../app/generated/prisma/client";
import { ROLE_PERMISSIONS } from "../app/types/roles";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN_MASTER: "Coordenação: configura o sistema e aprova operações críticas.",
  ADMIN_SECUNDARIO: "Secretaria: cadastra pessoas e mantém dados acadêmicos.",
  PROFESSOR: "Docente: consulta e lança notas das turmas vinculadas.",
  ALUNO: "Discente: consulta notas e realiza matrícula.",
  AUDITOR: "Auditoria: consulta logs e aprova acessos excepcionais.",
  SUPORTE_TECNICO: "Suporte temporário, sem permissões permanentes.",
};

/** Domínio do e-mail institucional gerado no banco para cada cargo. */
const ROLE_EMAIL_DOMAINS: Record<string, string> = {
  ADMIN_MASTER: "coord.academico.com",
  ADMIN_SECUNDARIO: "admin.academico.com",
  PROFESSOR: "prof.academico.com",
  ALUNO: "aluno.academico.com",
  AUDITOR: "auditor.academico.com",
  SUPORTE_TECNICO: "suporte.academico.com",
};

/** 7.1/7.2: perfis e permissões, sem duplicar a lógica entre seeds. */
export async function syncRolesAndPermissions(db: PrismaClient): Promise<void> {
  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await db.role.upsert({
      where: { name: roleName },
      update: {
        description: ROLE_DESCRIPTIONS[roleName],
        emailDomain: ROLE_EMAIL_DOMAINS[roleName] ?? null,
      },
      create: {
        name: roleName,
        description: ROLE_DESCRIPTIONS[roleName],
        emailDomain: ROLE_EMAIL_DOMAINS[roleName] ?? null,
      },
    });

    const permissionIds: string[] = [];
    for (const permission of permissions) {
      const [module, action] = permission.split(":") as [string, string];
      const record = await db.permission.upsert({
        where: { name: permission },
        update: {},
        create: { name: permission, module: module as never, action: action as never },
      });
      permissionIds.push(record.id);
    }

    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissionIds.length > 0) {
      await db.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
  }
}
