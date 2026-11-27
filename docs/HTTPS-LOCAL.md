# HTTPS local

O `proxy.ts` **não emite certificados**: ele roda dentro do Next, depois da
terminação TLS. Ele apenas redireciona HTTP→HTTPS e adiciona HSTS quando
`NODE_ENV=production`. A terminação TLS local é feita de uma das duas formas
abaixo.

## Opção 1 — `pnpm dev` com HTTPS (recomendado para desenvolvimento)

```bash
pnpm dev:https
```

O Next 16 (`next dev --experimental-https`) baixa o `mkcert`, gera um
certificado autoassinado em `certificates/` e imprime no console o caminho da
CA root. Use `https://localhost:3000` (definido em `BETTER_AUTH_URL`).

Para não ver o aviso do navegador, confie a CA gerada:

- **Chrome/Chromium**: `chrome://certificate-manager` → "Authorities" → importar
  o `ca.crt` impresso no console;
- **Firefox**: Configurações → Privacidade e Segurança → Ver certificados →
  Autoridades → Importar.

## Opção 2 — Docker Compose (Caddy)

O Compose agora publica o app pelo serviço `tls-proxy` (Caddy). O app continua
ouvindo HTTP em `app:3000`, e o Caddy termina TLS em `localhost:3000`:

```bash
docker compose up -d --build
```

Acesse `https://localhost:3000`. O Caddy gera uma CA interna; para confiar:

```bash
docker compose exec tls-proxy cat /data/caddy/pki/authorities/local/root.crt > caddy-local-ca.crt
```

Importe `caddy-local-ca.crt` no navegador/Sistema conforme a opção 1. Sem
importar, o navegador mostrará aviso de certificado autoassinado — é esperado
em desenvolvimento.

## Links de ativação

O seed gera as URLs a partir de `BETTER_AUTH_URL` (`app/lib/auth/activation.ts`),
que no `.env` local é `https://localhost:3000`. **Nunca use `0.0.0.0`** na URL:
ele é apenas o endereço de bind do servidor, não um host navegável. Se o
Chromium cacheou HSTS antigo para `localhost:3000`, remova em
`chrome://net-internals/#hsts` → "Delete domain security policies".
