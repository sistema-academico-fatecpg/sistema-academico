import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { activationUrl } from "../app/lib/auth/activation";
import {
  generateNumericCode,
  generateToken,
  hashToken,
  TOKEN_TTL_MS,
} from "../app/lib/auth/tokens";
import { syncRolesAndPermissions } from "../prisma/seed-roles";

/**
 * Massa de teste LOCAL: 3 Admin Master, 1 Admin Secundário, 2 professores e
 * 40 alunos com turmas, matrículas e notas. NENHUM e-mail é enviado: os links
 * de ativação são gravados em arquivo protegido e impressos no console.
 *
 * Apenas o primeiro Admin Master usa o TEST_EMAIL real (verificação pessoal);
 * os demais usam endereços fictícios, que nunca devem ser enviados.
 */
if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
  throw new Error("A massa de teste não pode ser gerada em produção");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL não definida");

const db = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
const TEST_EMAIL = process.env.TEST_EMAIL?.trim().toLowerCase() || null;
const FICTIONAL_DOMAIN = "ficticio.local";
const OUTPUT_DIR = process.env.TEST_DATA_OUTPUT_DIR?.trim() || path.join("/tmp", "opencode");

type Activation = {
  destinatario: string;
  destinatarioReal: boolean;
  emailInstitucional: string;
  nome: string;
  perfil: string;
  matricula: string;
  url: string;
  codigo: string;
};

const activations: Activation[] = [];

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}
function daysAhead(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}
async function roleId(name: string): Promise<string> {
  return (await db.role.findUniqueOrThrow({ where: { name } })).id;
}
function fictionalEmail(local: string): string {
  return `${local}@${FICTIONAL_DOMAIN}`;
}

/** Cria/reaproveita um usuário sem senha e sincroniza users.email com o e-mail por cargo gerado no banco. */
async function upsertUser(input: {
  registrationNumber: string;
  name: string;
  role: string;
  personalEmail: string;
}) {
  let user = await db.user.findUnique({
    where: { registrationNumber: input.registrationNumber },
  });
  if (!user) {
    user = await db.user.create({
      data: {
        name: input.name,
        email: `pendente-${input.registrationNumber.toLowerCase()}@${FICTIONAL_DOMAIN}`,
        personalEmail: input.personalEmail,
        registrationNumber: input.registrationNumber,
        status: "PENDING_ACTIVATION",
        emailVerified: false,
      },
    });
  } else if (user.name !== input.name || user.personalEmail !== input.personalEmail) {
    user = await db.user.update({
      where: { id: user.id },
      data: { name: input.name, personalEmail: input.personalEmail },
    });
  }

  const linkedRoleId = await roleId(input.role);
  await db.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: linkedRoleId } },
    update: {},
    create: { userId: user.id, roleId: linkedRoleId, assignedBy: null },
  });
  const link = await db.userRole.findUnique({
    where: { userId_roleId: { userId: user.id, roleId: linkedRoleId } },
  });
  if (link?.institutionalEmail && link.institutionalEmail !== user.email) {
    user = await db.user.update({
      where: { id: user.id },
      data: { email: link.institutionalEmail },
    });
  }
  return user;
}

/** Emite token + código por e-mail e devolve a URL pronta (sem enviar nada). */
async function issueActivation(user: {
  id: string;
  status: string;
  personalEmail: string | null;
  email: string;
  name: string;
  registrationNumber: string | null;
}) {
  if (user.status !== "PENDING_ACTIVATION") return null;

  const token = generateToken();
  const code = generateNumericCode();
  const now = new Date();
  await db.token.updateMany({
    where: { userId: user.id, purpose: "ACCOUNT_ACTIVATION", usedAt: null },
    data: { usedAt: now },
  });
  await db.token.create({
    data: {
      userId: user.id,
      purpose: "ACCOUNT_ACTIVATION",
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS.ACCOUNT_ACTIVATION),
    },
  });
  await db.token.updateMany({
    where: { userId: user.id, purpose: "EMAIL_CONFIRMATION", usedAt: null },
    data: { usedAt: now },
  });
  await db.token.create({
    data: {
      userId: user.id,
      purpose: "EMAIL_CONFIRMATION",
      tokenHash: hashToken(code),
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS.EMAIL_CONFIRMATION),
    },
  });

  return { url: activationUrl(token, code), code };
}

async function main() {
  await syncRolesAndPermissions(db);

  const masters = await Promise.all(
    [
      { n: 1, name: "Coordenação Geral" },
      { n: 2, name: "Vice-coordenação" },
      { n: 3, name: "Coordenação substituta" },
    ].map((item) =>
      upsertUser({
        registrationNumber: `MAST${String(item.n).padStart(3, "0")}`,
        name: item.name,
        role: "ADMIN_MASTER",
        personalEmail: item.n === 1 && TEST_EMAIL ? TEST_EMAIL : fictionalEmail(`master${item.n}`),
      }),
    ),
  );
  const secretary = await upsertUser({
    registrationNumber: "SEC001",
    name: "Secretaria",
    role: "ADMIN_SECUNDARIO",
    personalEmail: fictionalEmail("secretaria"),
  });
  const professors = await Promise.all(
    [
      { n: 1, name: "Professor de Algoritmos" },
      { n: 2, name: "Professora de Banco de Dados" },
    ].map((item) =>
      upsertUser({
        registrationNumber: `PROF${String(item.n).padStart(3, "0")}`,
        name: item.name,
        role: "PROFESSOR",
        personalEmail: fictionalEmail(`professor${item.n}`),
      }),
    ),
  );
  const students = await Promise.all(
    Array.from({ length: 40 }, (_, index) => {
      const n = index + 1;
      return upsertUser({
        registrationNumber: `2026${String(n).padStart(4, "0")}`,
        name: `Aluno ${String(n).padStart(3, "0")}`,
        role: "ALUNO",
        personalEmail: fictionalEmail(`aluno${String(n).padStart(3, "0")}`),
      });
    }),
  );

  const course = await db.course.upsert({
    where: { code: "CC" },
    update: { name: "Ciência da Computação (teste)" },
    create: { code: "CC", name: "Ciência da Computação (teste)" },
  });

  for (const [index, student] of students.entries()) {
    const minor = index % 9 === 8;
    const birthDate = new Date(minor ? "2012-03-15T00:00:00Z" : "2001-05-10T00:00:00Z");
    await db.studentProfile.upsert({
      where: { userId: student.id },
      update: {
        courseId: course.id,
        currentPeriod: 1,
        birthDate,
        guardianName: minor ? "Responsável Legal (teste)" : null,
        guardianConsentAt: minor ? new Date() : null,
      },
      create: {
        userId: student.id,
        courseId: course.id,
        currentPeriod: 1,
        birthDate,
        guardianName: minor ? "Responsável Legal (teste)" : null,
        guardianConsentAt: minor ? new Date() : null,
      },
    });
  }

  const period = await db.academicPeriod.upsert({
    where: { year_semester: { year: 2026, semester: 2 } },
    update: {
      name: "2026/2 (teste)",
      enrollmentOpensAt: daysAgo(120),
      enrollmentClosesAt: daysAhead(30),
      gradesOpenAt: daysAgo(60),
      gradesCloseAt: daysAhead(20),
      isCurrent: true,
    },
    create: {
      name: "2026/2 (teste)",
      year: 2026,
      semester: 2,
      enrollmentOpensAt: daysAgo(120),
      enrollmentClosesAt: daysAhead(30),
      gradesOpenAt: daysAgo(60),
      gradesCloseAt: daysAhead(20),
      isCurrent: true,
    },
  });

  const subjects = await Promise.all(
    [
      { code: "ALG1", name: "Algoritmos e Estruturas de Dados", periodNumber: 1, professor: 0 },
      { code: "BD1", name: "Banco de Dados", periodNumber: 1, professor: 1 },
      { code: "RED2", name: "Redes de Computadores", periodNumber: 2, professor: 0 },
      { code: "POO2", name: "Programação Orientada a Objetos", periodNumber: 2, professor: 0 },
      { code: "ENG3", name: "Engenharia de Software", periodNumber: 3, professor: 1 },
      { code: "BAN4", name: "Banco de Dados Avançado", periodNumber: 4, professor: 1 },
    ].map(async ({ code, name, periodNumber, professor }) => {
      const record = await db.subject.upsert({
        where: { code },
        update: { name, periodNumber, courseId: course.id },
        create: { code, name, periodNumber, courseId: course.id, workloadHours: 60 },
      });
      return { record, professor: professors[professor] };
    }),
  );

  const classGroups = await Promise.all(
    subjects.map(async ({ record, professor }, index) => {
      const group = await db.classGroup.upsert({
        where: {
          subjectId_academicPeriodId_professorId: {
            subjectId: record.id,
            academicPeriodId: period.id,
            professorId: professor.id,
          },
        },
        update: { room: `Sala ${(index % 3) + 1}` },
        create: {
          subjectId: record.id,
          academicPeriodId: period.id,
          professorId: professor.id,
          room: `Sala ${(index % 3) + 1}`,
          schedule: [{ weekday: (index % 5) + 1, start: "08:00", end: "10:00" }] as never,
        },
      });
      return { group, professor };
    }),
  );

  // Cada aluno é matriculado em duas turmas; parte das notas fica em branco (exibida como "-").
  for (const [index, student] of students.entries()) {
    const first = classGroups[index % classGroups.length];
    const second = classGroups[(index + 3) % classGroups.length];
    for (const { group, professor } of new Set([first, second])) {
      const enrollment = await db.enrollment.upsert({
        where: { studentId_classGroupId: { studentId: student.id, classGroupId: group.id } },
        update: { status: "ACTIVE" },
        create: {
          studentId: student.id,
          classGroupId: group.id,
          createdBy: secretary.id,
          status: "ACTIVE",
        },
      });
      if (index % 2 === 0) {
        const grade = await db.grade.upsert({
          where: { enrollmentId: enrollment.id },
          update: { value: 7 + (index % 4), status: "PUBLISHED" },
          create: {
            enrollmentId: enrollment.id,
            professorId: professor.id,
            value: 7 + (index % 4),
            status: "PUBLISHED",
          },
        });
        const historyCount = await db.gradeHistory.count({ where: { gradeId: grade.id } });
        if (historyCount === 0) {
          await db.gradeHistory.create({
            data: {
              gradeId: grade.id,
              oldValue: 6,
              newValue: 7 + (index % 4),
              changedBy: professor.id,
              reason: "Lançamento da massa de teste",
            },
          });
        }
      }
    }
  }

  // Algumas dependências (DP) para exercitar a regra de matrícula.
  for (const index of [8, 17, 26, 35]) {
    const student = students[index];
    const subject = subjects[0].record;
    await db.studentDependency.upsert({
      where: { studentId_subjectId: { studentId: student.id, subjectId: subject.id } },
      update: {},
      create: { studentId: student.id, subjectId: subject.id },
    });
  }

  for (const user of [...masters, secretary, ...professors, ...students]) {
    const issued = await issueActivation(user);
    activations.push({
      destinatario: user.personalEmail ?? fictionalEmail("sem-email"),
      destinatarioReal: user.id === masters[0].id && Boolean(TEST_EMAIL),
      emailInstitucional: user.email,
      nome: user.name,
      perfil:
        (await db.userRole.findFirst({ where: { userId: user.id }, include: { role: true } }))?.role
          .name ?? "DESCONHECIDO",
      matricula: user.registrationNumber ?? "",
      url: issued?.url ?? "(conta já ativada — sem novo link)",
      codigo: issued?.code ?? "",
    });
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outputFile = path.join(OUTPUT_DIR, "test-data-activation.json");
  await writeFile(
    outputFile,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        aviso: "NENHUM e-mail foi enviado. Destinatários fictícios não recebem mensagens.",
        activations,
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", mode: 0o600 },
  );

  console.log("Massa de teste criada (NENHUM e-mail enviado).");
  console.log(
    `Admin Master: ${masters.length} · Secretaria: 1 · Professores: ${professors.length} · Alunos: ${students.length} · Turmas: ${classGroups.length}`,
  );
  console.log("\nLinks de ativação — copie a URL no navegador:");
  for (const item of activations) {
    console.log(
      `${item.destinatarioReal ? "[REAL]" : "[FICTÍCIO — NÃO ENVIAR]"} ${item.destinatario} | institucional: ${item.emailInstitucional} | ${item.url}`,
    );
  }
  console.log(`\nArquivo protegido (0600): ${outputFile}`);
  console.log("Nenhuma senha foi definida pelo seed (8.2). Configure o TOTP após ativar (8.4.2).");
}

main()
  .catch((error) => {
    console.error("Falha ao gerar massa de teste:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
