import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { AlertType, SystemModule } from "@/app/types/common";
import type { AlertFilter, LogFilter, LogInput } from "@/app/types/log";

let pool: Pool | null = null;

function connection(): Pool | null {
  const url = process.env.AUDIT_DATABASE_URL;
  if (!url) return null;
  pool ??= new Pool({ connectionString: url, max: 5 });
  return pool;
}

/** Em produção, `AUDIT_DATABASE_URL` aponta para instância isolada (10.3). */
export function separateAuditEnabled(): boolean {
  return Boolean(process.env.AUDIT_DATABASE_URL);
}

type QueryResult<T> = { rows: T[] };

/**
 * Base de auditoria separada e append-only. A aplicação só inclui registros e
 * consulta; não há método de atualização ou exclusão. O trigger no banco
 * impede UPDATE/DELETE/TRUNCATE inclusive por conexões privilegiadas.
 */
export class SeparateAuditStore {
  private ready = false;

  private async run<T = Record<string, unknown>>(
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const client = connection();
    if (!client) return { rows: [] };
    return (await client.query(text, params)) as unknown as QueryResult<T>;
  }

  async initialize(): Promise<void> {
    if (this.ready) return;
    const client = connection();
    if (!client) return;
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        role TEXT,
        ip_address TEXT NOT NULL,
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        record_type TEXT,
        record_id TEXT,
        old_value JSONB,
        new_value JSONB,
        result TEXT NOT NULL,
        is_emergency BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS audit_logs_user_created_at_idx ON audit_logs(user_id, created_at);
      CREATE INDEX IF NOT EXISTS audit_logs_module_created_at_idx ON audit_logs(module, created_at);
      CREATE INDEX IF NOT EXISTS audit_logs_action_created_at_idx ON audit_logs(action, created_at);

      CREATE TABLE IF NOT EXISTS audit_alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB,
        log_id TEXT,
        acknowledged_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS audit_alerts_type_created_at_idx ON audit_alerts(type, created_at);

      CREATE OR REPLACE FUNCTION audit_logs_append_only() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Base de auditoria é append-only: % não permitido', TG_OP;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS audit_logs_no_mutation ON audit_logs;
      CREATE TRIGGER audit_logs_no_mutation
      BEFORE UPDATE OR DELETE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();

      DROP TRIGGER IF EXISTS audit_logs_no_truncate ON audit_logs;
      CREATE TRIGGER audit_logs_no_truncate
      BEFORE TRUNCATE ON audit_logs
      FOR STATEMENT EXECUTE FUNCTION audit_logs_append_only();
    `);
    this.ready = true;
  }

  private async json(value: unknown): Promise<string | null> {
    return value === undefined || value === null ? null : JSON.stringify(value);
  }

  async append(event: LogInput & { emergency?: boolean }) {
    await this.initialize();
    const id = randomUUID();
    await this.run(
      `INSERT INTO audit_logs
        (id, user_id, role, ip_address, action, module, record_type, record_id,
         old_value, new_value, result, is_emergency, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        id,
        event.userId ?? null,
        event.role ?? null,
        event.ipAddress,
        event.action,
        event.module,
        event.recordType ?? null,
        event.recordId ?? null,
        await this.json(event.oldValue),
        await this.json(event.newValue),
        event.result,
        event.emergency ?? false,
        event.createdAt ?? new Date(),
      ],
    );
    return { id };
  }

  async countRecentFailures(userId: string, since: Date): Promise<number> {
    await this.initialize();
    const result = await this.run<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM audit_logs
       WHERE user_id = $1 AND action = 'LOGIN_FAILED' AND result = 'FAILURE'
         AND created_at >= $2`,
      [userId, since],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async createAlert(type: AlertType, message: string, metadata?: unknown, logId?: string) {
    await this.initialize();
    const id = randomUUID();
    await this.run(
      `INSERT INTO audit_alerts (id, type, message, metadata, log_id, created_at)
       VALUES ($1,$2,$3,$4,$5,now())`,
      [id, type, message, await this.json(metadata), logId ?? null],
    );
    return { id, type, message, metadata: metadata ?? null, logId: logId ?? null };
  }

  async findMany(filter: LogFilter) {
    await this.initialize();
    const conditions: string[] = [];
    const params: unknown[] = [];
    const add = (column: string, value: unknown) => {
      params.push(value);
      conditions.push(`${column} = $${params.length}`);
    };
    if (filter.userId) add("user_id", filter.userId);
    if (filter.module) add("module", filter.module);
    if (filter.result) add("result", filter.result);
    if (filter.action) {
      params.push(`%${filter.action}%`);
      conditions.push(`action ILIKE $${params.length}`);
    }
    if (filter.from) {
      params.push(new Date(filter.from));
      conditions.push(`created_at >= $${params.length}`);
    }
    if (filter.to) {
      params.push(new Date(filter.to));
      conditions.push(`created_at <= $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (filter.page - 1) * filter.pageSize;
    params.push(filter.pageSize, offset);
    const limitPlaceholder = `$${params.length - 1}`;
    const offsetPlaceholder = `$${params.length}`;

    const [rows, total] = await Promise.all([
      this.run(
        `SELECT * FROM audit_logs ${where}
         ORDER BY created_at DESC LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
        params,
      ),
      this.run<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM audit_logs ${where}`,
        params.slice(0, -2),
      ),
    ]);
    return {
      items: rows.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        role: row.role,
        ipAddress: row.ip_address,
        action: row.action,
        module: row.module as SystemModule,
        recordType: row.record_type,
        recordId: row.record_id,
        oldValue: row.old_value,
        newValue: row.new_value,
        result: row.result,
        isEmergency: row.is_emergency,
        createdAt: row.created_at,
        user: null,
      })),
      total: Number(total.rows[0]?.count ?? 0),
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async listAlerts(filter: AlertFilter) {
    await this.initialize();
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filter.type) {
      params.push(filter.type);
      conditions.push(`type = $${params.length}`);
    }
    if (filter.acknowledged === "true") conditions.push("acknowledged_at IS NOT NULL");
    if (filter.acknowledged === "false") conditions.push("acknowledged_at IS NULL");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (filter.page - 1) * filter.pageSize;
    params.push(filter.pageSize, offset);
    const [rows, total] = await Promise.all([
      this.run(
        `SELECT * FROM audit_alerts ${where}
         ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
      this.run<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM audit_alerts ${where}`,
        params.slice(0, -2),
      ),
    ]);
    return {
      items: rows.rows,
      total: Number(total.rows[0]?.count ?? 0),
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async acknowledgeAlert(id: string) {
    await this.initialize();
    const result = await this.run(
      `UPDATE audit_alerts SET acknowledged_at = now() WHERE id = $1 RETURNING *`,
      [id],
    );
    return result.rows[0] ?? null;
  }
}
