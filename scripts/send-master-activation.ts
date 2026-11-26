import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { activationUrl } from "../app/lib/auth/activation";
import { generateInstitutionalEmail } from "../app/lib/auth/institutional-email";
import { TokenService } from "../app/lib/auth/tokens";
import {
  accountActivationEmail,
  maskEmail,
  sendEmail,
  testAccountsSummaryEmail,
} from "../app/lib/email";
import { TokenRepository } from "../app/repositories/token.repository";
import { syncRolesAndPermissions } from "../prisma/seed-roles";

/**
 * Prepara o usuário de teste (TEST_EMAIL) para o fluxo de ativação e envia um
 * link/código novo pela Resend. Usado pelo serviço `activation-mailer` do
 * docker-compose: a cada subida dos containers, contas ainda pendentes recebem
 * o e-mail pronto para o teste, sem exigir comando manual. Contas já ativadas
 * são preservadas.
 */
const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl) throw new Error("DATABASE_URL não definida");

const email = process.env.TEST_EMAIL?.trim().toLowerCase() ?? "";
if (!email) throw new Error("TEST_EMAIL não definida");

const db = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

type ActivationFile = {
  generatedAt?: string;
  activations: Array<{
    institutionalEmail: string;
    personalEmail: string | null;
    name: string;
    role: string;
    url: string;
    code: string;
  }>;
};

async function main() {
  await syncRolesAndPermissions(db);

  // TEST_EMAIL é o e-mail pessoal; a conta é identificada pelo institucional.
  let user = await db.user.findFirst({
    where: { OR: [{ email }, { personalEmail: email }] },
  });
  if (!user) {
    const name = "Coordenação";
    const institutionalEmail = await generateInstitutionalEmail(name, async (candidate) =>
      Boolean(await db.user.findUnique({ where: { email: candidate } })),
    );
    user = await db.user.create({
      data: {
        name,
        email: institutionalEmail,
        personalEmail: email,
        status: "PENDING_ACTIVATION",
        emailVerified: false,
      },
    });
  } else if (user.personalEmail !== email) {
    user = await db.user.update({ where: { id: user.id }, data: { personalEmail: email } });
  }

  const role = await db.role.findUniqueOrThrow({ where: { name: "ADMIN_MASTER" } });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id, assignedBy: null },
  });

  // Conta já ativada preserva senha, sessão e chave TOTP. Reabrir a conta a
  // cada subida invalidava o autenticador do titular e seus links anteriores.
  if (user.status !== "PENDING_ACTIVATION") {
    console.log(`Conta ${user.email} já está ${user.status}; nenhum novo link foi emitido.`);
    return;
  }

  const issued = await new TokenService(new TokenRepository(db)).issue(
    user.id,
    "ACCOUNT_ACTIVATION",
  );
  const url = activationUrl(issued.token, issued.code);

  const result = await sendEmail(
    accountActivationEmail({
      to: email,
      name: user.name,
      institutionalEmail: user.email,
      personalEmail: user.personalEmail ?? email,
      activationUrl: url,
      validHours: 24,
    }),
  );
  if (result.skipped) {
    throw new Error("E-mail não enviado: configure RESEND_API_KEY e EMAIL_FROM");
  }

  // O titular também recebe a lista de e-mails institucionais criados: sem
  // isso, não há como saber qual conta usar no login. Tokens não são repetidos.
  const masters = await db.user.findMany({
    where: { roles: { some: { role: { name: "ADMIN_MASTER" } } } },
    select: { name: true, email: true, status: true },
    orderBy: { email: "asc" },
  });
  await sendEmail(
    testAccountsSummaryEmail({
      to: email,
      accounts: masters.map((master) => ({
        name: master.name,
        email: master.email,
        role: "ADMIN_MASTER",
        status: master.status,
      })),
    }),
  );

  const outputDir = process.env.TEST_DATA_OUTPUT_DIR?.trim() || "/tmp/opencode";
  await mkdir(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, "test-data-activation.json");

  let data: ActivationFile = { activations: [] };
  try {
    data = JSON.parse(await readFile(outputFile, "utf8")) as ActivationFile;
    data.activations ??= [];
  } catch {
    // Arquivo ainda não existe: começa do zero.
  }

  const activation = {
    institutionalEmail: user.email,
    personalEmail: user.personalEmail ?? email,
    name: user.name,
    role: "ADMIN_MASTER",
    url,
    code: issued.code,
  };
  const index = data.activations.findIndex((item) => item.institutionalEmail === user.email);
  if (index >= 0) data.activations[index] = activation;
  else data.activations.push(activation);
  data.generatedAt = new Date().toISOString();

  await writeFile(outputFile, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  console.log(`E-mail de ativação enviado para ${maskEmail(email)} (id Resend ${result.id}).`);
  console.log(`Link e código atualizados em ${outputFile} (0600).`);
  console.log("Nenhum segredo foi gravado em log (10.5).");
}

main()
  .catch((error) => {
    console.error("Falha ao enviar ativação:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
