-- E-mail institucional por cargo, gerado no banco no INSERT de user_roles.
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "email_domain" TEXT;
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "institutional_email" TEXT;

UPDATE "roles" SET "email_domain" = CASE "name"::text
  WHEN 'ALUNO' THEN 'aluno.academico.com'
  WHEN 'PROFESSOR' THEN 'prof.academico.com'
  WHEN 'ADMIN_MASTER' THEN 'coord.academico.com'
  WHEN 'ADMIN_SECUNDARIO' THEN 'admin.academico.com'
  WHEN 'AUDITOR' THEN 'auditor.academico.com'
  WHEN 'SUPORTE_TECNICO' THEN 'suporte.academico.com'
  ELSE 'academico.com'
END WHERE "email_domain" IS NULL;

CREATE SEQUENCE IF NOT EXISTS "user_role_email_seq" START 1;

CREATE OR REPLACE FUNCTION compute_user_role_email(p_user_id TEXT, p_role_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_domain TEXT;
  v_slug TEXT;
  v_number TEXT;
BEGIN
  SELECT COALESCE(NULLIF(r.email_domain, ''), 'academico.com')
    INTO v_domain FROM roles r WHERE r.id = p_role_id;

  SELECT regexp_replace(
           regexp_replace(
             translate(lower(u.name), 'áàâãéêíóôõúç', 'aaaaeeiooouc'),
             '[^a-z0-9]+', '.', 'g'
           ),
           '\.+', '.', 'g'
         )
    INTO v_slug FROM users u WHERE u.id = p_user_id;
  v_slug := trim(both '.' FROM COALESCE(v_slug, ''));
  IF v_slug = '' THEN v_slug := 'usuario'; END IF;

  SELECT regexp_replace(COALESCE(u.registration_number, ''), '\D', '', 'g')
    INTO v_number FROM users u WHERE u.id = p_user_id;
  IF v_number IS NULL OR v_number = '' THEN
    v_number := lpad(nextval('user_role_email_seq')::text, 4, '0');
  END IF;

  RETURN v_slug || v_number || '@' || COALESCE(v_domain, 'academico.com');
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION set_user_role_institutional_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.institutional_email := compute_user_role_email(NEW."userId", NEW."roleId");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_roles_institutional_email ON "user_roles";
CREATE TRIGGER user_roles_institutional_email
  BEFORE INSERT ON "user_roles"
  FOR EACH ROW EXECUTE FUNCTION set_user_role_institutional_email();

-- Backfill: um e-mail por usuário (ignora multiple roles, conforme política atual).
UPDATE "user_roles" ur
SET "institutional_email" = compute_user_role_email(ur."userId", ur."roleId")
WHERE ur."institutional_email" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_institutional_email_key"
  ON "user_roles"("institutional_email");
