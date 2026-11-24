-- Base de auditoria separada (Política de Segurança, seção 10.3).
-- Aplicar em um banco DISTINTO do acadêmico, usando AUDIT_DATABASE_URL.
-- A aplicação só faz INSERT/SELECT; UPDATE/DELETE/TRUNCATE são bloqueados por trigger.

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
CREATE INDEX IF NOT EXISTS audit_alerts_acknowledged_at_idx ON audit_alerts(acknowledged_at);

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

-- Recomendações operacionais (executadas pela Infraestrutura, fora da aplicação):
-- REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs, audit_alerts FROM <role_da_aplicacao>;
-- GRANT INSERT, SELECT ON audit_logs, audit_alerts TO <role_da_aplicacao>;
