-- 7.2: perfis novos em runtime (nome livre, criados sem permissões).
ALTER TABLE "roles" ALTER COLUMN "name" TYPE TEXT USING "name"::text;

-- 8.8: substituição de coordenador (bloqueio da conta anterior após ativação).
ALTER TABLE "users" ADD COLUMN "replaces_user_id" TEXT;

-- 11.1.3: identificação de menores para exigir consentimento do responsável.
ALTER TABLE "student_profiles" ADD COLUMN "birth_date" TIMESTAMP(3);
