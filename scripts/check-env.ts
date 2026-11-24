import "dotenv/config";
import { assertProductionSecrets } from "../app/lib/security/env";

/** 12.1/12.4: falha cedo se a instalação produtiva estiver insegura. */
(process.env as Record<string, string>).NODE_ENV = "production";
assertProductionSecrets();
console.log("Configuração de produção validada.");
