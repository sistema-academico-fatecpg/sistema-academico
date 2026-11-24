-- Acesso excepcional aos logs (10.8): investigação do próprio Auditor exige
-- autorização formal da direção registrada junto à solicitação.
ALTER TABLE "support_access_grants"
  ADD COLUMN "involves_auditor" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "authorization_document" TEXT;
