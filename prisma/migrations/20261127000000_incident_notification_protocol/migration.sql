-- 13.4: protocolo de notificação (destinatário, conteúdo e evidência de entrega).
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "notification_protocol" JSONB;
