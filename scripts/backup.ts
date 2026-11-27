import "../app/lib/env/database";
import { BACKUP_SCHEDULE, BackupService } from "../app/lib/security/backup-service";

type BackupType = "FULL" | "INCREMENTAL" | "SEMESTER_CLOSING";

const types: Record<string, BackupType> = {
  full: "FULL",
  incremental: "INCREMENTAL",
  closing: "SEMESTER_CLOSING",
};

const BACKUP_API_URL =
  process.env.BACKUP_SCHEDULER_URL?.trim() || "http://app:3000/api/maintenance/backup";

/** Agendador 11.3.1: dispara o endpoint protegido nas frequências do serviço. */
function matchesCron(expression: string, date: Date): boolean {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = expression.trim().split(/\s+/);
  const field = (part: string, value: number): boolean =>
    part.split(",").some((item) => {
      if (item === "*") return true;
      const range = item.split("-");
      if (range.length === 2) {
        return value >= Number(range[0]) && value <= Number(range[1]);
      }
      return Number(item) === value;
    });
  return (
    field(minute, date.getUTCMinutes()) &&
    field(hour, date.getUTCHours()) &&
    field(dayOfMonth, date.getUTCDate()) &&
    field(month, date.getUTCMonth() + 1) &&
    field(dayOfWeek, date.getUTCDay())
  );
}

async function invokeBackup(type: BackupType, secret: string): Promise<void> {
  const response = await fetch(BACKUP_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-maintenance-secret": secret,
    },
    body: JSON.stringify({ type }),
  });
  if (!response.ok) {
    throw new Error(`Endpoint de backup respondeu ${response.status}: ${await response.text()}`);
  }
  const body = (await response.json()) as { backup?: { id?: string } };
  console.log(`[schedule] ${type} disparado: ${body.backup?.id ?? "sem id"}`);
}

async function schedule(): Promise<never> {
  const secret = process.env.MAINTENANCE_SECRET?.trim();
  if (!secret) {
    throw new Error("MAINTENANCE_SECRET é obrigatório para o agendador de backups (11.3.1)");
  }
  console.log(
    `Agendador de backups (UTC) → ${BACKUP_API_URL}: ` +
      Object.entries(BACKUP_SCHEDULE)
        .map(([type, cron]) => `${type}=${cron}`)
        .join(" · "),
  );
  const lastRun = new Map<string, string>();
  for (;;) {
    const now = new Date();
    const untilNextMinute = 60_000 - (now.getUTCSeconds() * 1000 + now.getUTCMilliseconds());
    await new Promise((resolve) => setTimeout(resolve, untilNextMinute));
    const current = new Date();
    const minuteKey = current.toISOString().slice(0, 16);
    for (const [type, expression] of Object.entries(BACKUP_SCHEDULE)) {
      if (!matchesCron(expression, current)) continue;
      if (lastRun.get(type) === minuteKey) continue;
      lastRun.set(type, minuteKey);
      try {
        await invokeBackup(type as BackupType, secret);
      } catch (error) {
        console.error(`[schedule] falha ao disparar ${type}:`, error);
      }
    }
  }
}

async function main() {
  const arg = (process.argv[2] ?? "incremental").toLowerCase();
  if (arg === "schedule") return schedule();
  const type = types[arg];
  if (!type) throw new Error("Uso: pnpm backup [full|incremental|closing|schedule]");
  const record = await new BackupService().create(
    type,
    process.env.BACKUP_OPERATOR ?? "infraestrutura",
  );
  console.log(`Backup ${type} criado e criptografado: ${record.id}`);
  console.log(
    `Destinos: ${record.destinations} · retenção até ${record.retentionUntil.toISOString()}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
