import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * 12.4: varredura leve de segredos no repositório. Complementa (não substitui)
 * o secret scanning do provedor e a revisão de código obrigatória (12.5).
 */
const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter((file) => file && !file.startsWith("node_modules/"));

const problems: string[] = [];
const envFile = /\.env(\.|$)/;
const secretAssignment = /^(?!#)\s*(?:[A-Z_]*(?:SECRET|PASSWORD|TOKEN|KEY)[A-Z_]*)\s*=\s*\S+/i;
const privateKey = /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/;
const providerToken = /(?:sk_live_|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9]{10,}/;

for (const file of files) {
  if (file.endsWith(".env.example") || file.endsWith(".md")) continue;
  let content: string;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (envFile.test(file) && secretAssignment.test(content)) {
    problems.push(`${file}: arquivo .env versionado com segredo preenchido`);
  }
  if (privateKey.test(content)) problems.push(`${file}: chave privada versionada`);
  if (providerToken.test(content)) problems.push(`${file}: token de provedor versionado`);
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Secret scan OK: ${files.length} arquivos versionados verificados.`);
}
