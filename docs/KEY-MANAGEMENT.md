# Gestão de chaves criptográficas (11.2)

- Algoritmo: **AES-256-GCM** (`app/lib/security/crypto.ts`), com IV aleatório de 12 bytes e `authTag` de 16 bytes. Aplicado a `sensitive_data` e a todos os arquivos de backup.
- Chave ativa: `DATA_ENCRYPTION_KEY` (32 bytes em hexadecimal, 64 caracteres). Chave anterior: `DATA_ENCRYPTION_KEY_PREVIOUS`, usada apenas durante rotação.
- Cofre: a chave vive em gerenciador de segredos da Infraestrutura, nunca no código, no banco acadêmico ou junto aos backups. A Equipe de Desenvolvimento implementa o uso, mas não tem acesso à chave de produção (7.4).
- Acesso ao cofre restrito a **duas pessoas nominais** da Infraestrutura.
- Rotação **anual** ou imediata em suspeita de vazamento: `DATA_ENCRYPTION_KEY` recebe a chave nova, `DATA_ENCRYPTION_KEY_PREVIOUS` a antiga, executa-se `pnpm key:rotate` e, em seguida, recriptografam-se os backups antes de descartar a chave antiga.
- `pnpm check:env` valida em produção: `BETTER_AUTH_SECRET`, `DATABASE_URL`, `DATA_ENCRYPTION_KEY`, `MAINTENANCE_SECRET`, `AUDIT_DATABASE_URL` e `BACKUP_TEST_DATABASE_URL` (ambiente separado obrigatório para o teste de restauração).
- HTTPS/TLS 1.2+ é responsabilidade do proxy/servidor em produção; os cookies de sessão usam `Secure`, `HttpOnly` e `SameSite=lax`.
