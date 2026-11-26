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
import { encryptText } from "../app/lib/security/crypto";
import { syncRolesAndPermissions } from "../prisma/seed-roles";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não definida");
}

const db = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

const TEST_EMAIL = process.env.TEST_EMAIL?.trim().toLowerCase();
const DOMAIN = "fatecpg.edu.br";
const mail = (local: string) => `${local}@${DOMAIN}`;

type Activation = {
  email: string;
  name: string;
  role: string;
  url: string;
  code: string;
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

/**
 * Cria (ou reutiliza) um usuário SEM SENHA, atribui o perfil e emite um link
 * de ativação de uso único. Nunca define senha — política 8.2.
 */
async function upsertUser(input: {
  email: string;
  name: string;
  role: string;
  registrationNumber?: string;
}) {
  let user = await db.user.findUnique({ where: { email: input.email } });
  if (!user) {
    user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        registrationNumber: input.registrationNumber ?? null,
        status: "PENDING_ACTIVATION",
        emailVerified: false,
      },
    });
  }
  await db.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: await roleId(input.role) } },
    update: {},
    create: { userId: user.id, roleId: await roleId(input.role), assignedBy: null },
  });

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

  activations.push({
    email: user.email,
    name: input.name,
    role: input.role,
    url: activationUrl(token),
    code,
  });
  return user;
}

async function main() {
  await syncRolesAndPermissions(db);

  // 8.1.2: três contas Master. A primeira usa TEST_EMAIL, se definido.
  const masters = await Promise.all([
    upsertUser({
      email: TEST_EMAIL ?? mail("coord"),
      name: TEST_EMAIL ? "Coordenação (TEST_EMAIL)" : "Coordenação",
      role: "ADMIN_MASTER",
    }),
    upsertUser({ email: mail("coord2"), name: "Vice-coordenação", role: "ADMIN_MASTER" }),
    upsertUser({ email: mail("coord3"), name: "Coordenação substituta", role: "ADMIN_MASTER" }),
  ]);
  const secondary = await upsertUser({
    email: mail("sec1"),
    name: "Secretaria",
    role: "ADMIN_SECUNDARIO",
  });
  const professor = await upsertUser({
    email: mail("prof1"),
    name: "Professor de Algoritmos",
    role: "PROFESSOR",
    registrationNumber: "PROF0001",
  });
  const student = await upsertUser({
    email: mail("aluno1"),
    name: "Aluno Regular",
    role: "ALUNO",
    registrationNumber: "20260001",
  });
  const studentMinor = await upsertUser({
    email: mail("aluno2"),
    name: "Aluno com DP",
    role: "ALUNO",
    registrationNumber: "20260002",
  });
  const auditor = await upsertUser({
    email: mail("auditor1"),
    name: "Auditor institucional",
    role: "AUDITOR",
  });
  const support = await upsertUser({
    email: mail("infra1"),
    name: "Infraestrutura (suporte)",
    role: "SUPORTE_TECNICO",
  });

  const course = await db.course.upsert({
    where: { code: "CC" },
    update: { name: "Ciência da Computação (teste)" },
    create: { code: "CC", name: "Ciência da Computação (teste)" },
  });

  // 11.1.3: perfis de alunos com data de nascimento e consentimento.
  for (const [user, birthDate, minor] of [
    [student, new Date("2001-05-10T00:00:00Z"), false],
    [studentMinor, new Date("2012-03-15T00:00:00Z"), true],
  ] as const) {
    await db.studentProfile.upsert({
      where: { userId: user.id },
      update: {
        courseId: course.id,
        currentPeriod: 1,
        birthDate,
        guardianName: minor ? "Responsável Legal (teste)" : null,
        guardianConsentAt: minor ? new Date() : null,
      },
      create: {
        userId: user.id,
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
      { code: "ALG1", name: "Algoritmos e Estruturas de Dados", periodNumber: 1 },
      { code: "BD1", name: "Banco de Dados", periodNumber: 1 },
      { code: "RED2", name: "Redes de Computadores", periodNumber: 2 },
    ].map(async (subject) =>
      db.subject.upsert({
        where: { code: subject.code },
        update: { name: subject.name, periodNumber: subject.periodNumber, courseId: course.id },
        create: { ...subject, courseId: course.id, workloadHours: 60 },
      }),
    ),
  );
  const [algorithms, databaseSubject, networks] = subjects;

  const classes = await Promise.all(
    [
      {
        subject: algorithms,
        schedule: [{ weekday: 1, start: "08:00", end: "10:00" }],
      },
      {
        subject: databaseSubject,
        schedule: [{ weekday: 1, start: "10:00", end: "12:00" }],
      },
      {
        subject: networks,
        schedule: [{ weekday: 2, start: "14:00", end: "16:00" }],
      },
    ].map(async ({ subject, schedule }) =>
      db.classGroup.upsert({
        where: {
          subjectId_academicPeriodId_professorId: {
            subjectId: subject.id,
            academicPeriodId: period.id,
            professorId: professor.id,
          },
        },
        update: { schedule: schedule as never, room: "Sala 1" },
        create: {
          subjectId: subject.id,
          academicPeriodId: period.id,
          professorId: professor.id,
          schedule: schedule as never,
          room: "Sala 1",
        },
      }),
    ),
  );
  const [algorithmClass, databaseClass, networkClass] = classes;

  // DP do aluno 2: ALG1 é obrigatória e vem primeiro.
  await db.studentDependency.upsert({
    where: { studentId_subjectId: { studentId: studentMinor.id, subjectId: algorithms.id } },
    update: { resolvedAt: null },
    create: { studentId: studentMinor.id, subjectId: algorithms.id },
  });

  for (const [user, group, isDependency] of [
    [student, algorithmClass, false],
    [student, databaseClass, false],
    [studentMinor, algorithmClass, true],
    [studentMinor, networkClass, false],
  ] as const) {
    await db.enrollment.upsert({
      where: {
        studentId_classGroupId: { studentId: user.id, classGroupId: group.id },
      },
      update: { status: "ACTIVE", isDependency },
      create: {
        studentId: user.id,
        classGroupId: group.id,
        createdBy: secondary.id,
        status: "ACTIVE",
        isDependency,
      },
    });
  }

  const studentAlgorithmEnrollment = await db.enrollment.findUniqueOrThrow({
    where: {
      studentId_classGroupId: { studentId: student.id, classGroupId: algorithmClass.id },
    },
  });
  const grade = await db.grade.upsert({
    where: { enrollmentId: studentAlgorithmEnrollment.id },
    update: { value: 8.5, status: "PUBLISHED" },
    create: {
      enrollmentId: studentAlgorithmEnrollment.id,
      professorId: professor.id,
      value: 8.5,
      status: "PUBLISHED",
    },
  });
  const historyCount = await db.gradeHistory.count({ where: { gradeId: grade.id } });
  if (historyCount === 0) {
    await db.gradeHistory.create({
      data: {
        gradeId: grade.id,
        oldValue: 7,
        newValue: 8.5,
        changedBy: professor.id,
        reason: "Lançamento de teste",
      },
    });
  }

  // Operações críticas: uma pendente e uma executada (histórico).
  const pendingOperation = await db.criticalOperationRequest.findFirst({
    where: { operation: "GRANT_REVOKE_ADMIN_PERMISSION", reason: "Teste: conceder perfil" },
  });
  if (!pendingOperation) {
    await db.criticalOperationRequest.create({
      data: {
        requestedBy: masters[0].id,
        operation: "GRANT_REVOKE_ADMIN_PERMISSION",
        module: "ROLES",
        recordType: "User",
        reason: "Teste: conceder perfil",
        payload: {
          action: "ADD_ROLE",
          userId: secondary.id,
          role: "ADMIN_SECUNDARIO",
        } as never,
        status: "PENDING",
      },
    });
    await db.criticalOperationRequest.create({
      data: {
        requestedBy: masters[0].id,
        approvedBy: masters[1].id,
        operation: "INCLUDE_OR_REPLACE_ADMIN_MASTER",
        module: "USERS",
        reason: "Teste: inclusão de Master já executada",
        authorizationDocument: "Ofício de teste 001/2026",
        payload: { action: "ADD_ROLE", userId: masters[2].id, role: "ADMIN_MASTER" } as never,
        status: "EXECUTED",
        decidedAt: daysAgo(2),
        executedAt: daysAgo(2),
      },
    });
  }

  // Acesso excepcional de suporte: um pendente e um expirado.
  const pendingGrant = await db.supportAccessGrant.findFirst({
    where: { requestedBy: support.id, reason: "Teste: investigação de login" },
  });
  if (!pendingGrant) {
    await db.supportAccessGrant.create({
      data: {
        requestedBy: support.id,
        reason: "Teste: investigação de login",
        startsAt: new Date(),
        endsAt: daysAhead(1 / 24),
        modules: {
          create: [{ module: "AUDIT_LOGS", canRead: true }],
        },
      },
    });
    await db.supportAccessGrant.create({
      data: {
        requestedBy: support.id,
        reason: "Teste: concessão expirada",
        status: "EXPIRED",
        startsAt: daysAgo(2),
        endsAt: daysAgo(1),
        modules: { create: [{ module: "AUDIT_LOGS", canRead: true }] },
      },
    });
  }

  // Logs e alertas de exemplo (10.1/10.2/10.6).
  const logEntries: Array<{
    userId: string;
    role: "ALUNO" | "PROFESSOR" | "ADMIN_MASTER" | "AUDITOR";
    action: string;
    module: string;
    result?: "SUCCESS" | "FAILURE";
  }> = [
    { userId: student.id, role: "ALUNO", action: "LOGIN_SUCCESS", module: "USERS" },
    {
      userId: student.id,
      role: "ALUNO",
      action: "LOGIN_FAILED",
      module: "USERS",
      result: "FAILURE",
    },
    { userId: professor.id, role: "PROFESSOR", action: "GRADE_CHANGED", module: "GRADES" },
    {
      userId: masters[0].id,
      role: "ADMIN_MASTER",
      action: "CRITICAL_OPERATION_REQUESTED",
      module: "ROLES",
    },
    { userId: auditor.id, role: "AUDITOR", action: "AUDIT_LOG_VIEWED", module: "AUDIT_LOGS" },
  ];
  for (const entry of logEntries) {
    const exists = await db.log.count({
      where: { userId: entry.userId, action: entry.action, module: entry.module as never },
    });
    if (exists === 0) {
      await db.log.create({
        data: {
          ...entry,
          module: entry.module as never,
          userId: entry.userId,
          ipAddress: "127.0.0.1",
          result: entry.result ?? "SUCCESS",
          newValue: { origin: "seed:test-data" } as never,
        },
      });
    }
  }
  for (const [type, message] of [
    ["LOGIN_FAILURE_SEQUENCE", "Alerta de teste: sequência de falhas de login."],
    ["PERMISSION_CHANGED", "Alerta de teste: permissões alteradas."],
  ] as const) {
    const exists = await db.auditAlert.count({ where: { type, message } });
    if (exists === 0) await db.auditAlert.create({ data: { type, message } });
  }

  // 11.1.2: dado sensível criptografado (se a chave estiver configurada).
  if (process.env.DATA_ENCRYPTION_KEY) {
    const exists = await db.sensitiveData.count({
      where: { userId: student.id, type: "LAUDO_MEDICO" },
    });
    if (exists === 0) {
      const encrypted = encryptText("Laudo médico fictício para testes");
      await db.sensitiveData.create({
        data: {
          userId: student.id,
          type: "LAUDO_MEDICO",
          cipherText: encrypted.cipherText,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          createdBy: secondary.id,
        },
      });
    }
  } else {
    console.warn("[seed] DATA_ENCRYPTION_KEY ausente: dado sensível de teste não criado.");
  }

  const dataRequest = await db.dataSubjectRequest.findFirst({
    where: { userId: student.id, type: "ACCESS" },
  });
  if (!dataRequest) {
    await db.dataSubjectRequest.create({
      data: {
        userId: student.id,
        type: "ACCESS",
        reason: "Teste: consulta de dados pessoais",
      },
    });
  }

  const incident = await db.incident.findFirst({ where: { title: "Incidente de teste" } });
  if (!incident) {
    await db.incident.create({
      data: {
        title: "Incidente de teste",
        description: "Incidente fictício para validar o fluxo de notificação do DPO.",
        severity: "HIGH",
        reportedBy: auditor.id,
        evidence: { origin: "seed:test-data" } as never,
      },
    });
  }

  const review = await db.policyReview.findFirst({ where: { reason: "Revisão anual de teste" } });
  if (!review) {
    await db.policyReview.create({
      data: {
        reviewedBy: masters[0].id,
        reason: "Revisão anual de teste",
        reviewedAt: new Date(),
        nextReviewAt: daysAhead(365),
        notes: "Massa de teste — revisão em dia",
      },
    });
  }

  const backup = await db.backupRecord.findFirst({
    where: { filePath: "/tmp/opencode/backups/local/seed-full.enc" },
  });
  if (!backup) {
    await db.backupRecord.create({
      data: {
        type: "FULL",
        status: "RESTORE_TESTED",
        destinations: "LOCAL_DISK,CLOUD",
        filePath: "/tmp/opencode/backups/local/seed-full.enc",
        checksum: "seed-checksum-placeholder",
        iv: "seed-iv",
        authTag: "seed-auth-tag",
        sizeBytes: 1024,
        encrypted: true,
        retentionUntil: daysAhead(365),
        restoreTestAt: daysAgo(7),
        createdBy: "seed:test-data",
      },
    });
  }
  const media = await db.backupMedia.findFirst({ where: { label: "HD-SEED-01" } });
  if (!media) {
    await db.backupMedia.create({
      data: {
        label: "HD-SEED-01",
        lockerLocation: "Cofre A (teste)",
        installedAt: daysAgo(30),
        lastInspectionAt: new Date(),
        disconnectedAt: new Date(),
      },
    });
  }

  // Links de ativação em arquivo local protegido (nunca em log/e-mail).
  const outputDir = process.env.TEST_DATA_OUTPUT_DIR?.trim() || path.join("/tmp", "opencode");
  await mkdir(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, "test-data-activation.json");
  await writeFile(
    outputFile,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), activations }, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );

  console.log("Massa de teste criada.");
  console.log(
    `Perfis: ${6} · usuários: ${activations.length} · cursos: 1 · períodos: 1 · turmas: 3`,
  );
  console.log(`Usuários de teste (sem senha): ${activations.map((item) => item.email).join(", ")}`);
  console.log(`Links de ativação e códigos (SECRETOS, uso único): ${outputFile}`);
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
