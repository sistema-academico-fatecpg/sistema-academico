-- Marca todas as ações de contas Master emergenciais (seção 8.8.3).
ALTER TABLE "logs" ADD COLUMN "is_emergency" BOOLEAN NOT NULL DEFAULT false;
