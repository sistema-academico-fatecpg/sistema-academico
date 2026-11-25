import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * 12.2: desenvolvimento e testes usam apenas dados fictícios/anonimizados.
 * Varre arquivos de seed, testes e fixtures versionados em busca de padrões de
 * dados pessoais reais (CPF, RG, telefone, cartão, segredos de provedor).
 */
const PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "CPF", re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/ },
  { name: "telefone", re: /\b\(\d{2}\)\s?\d{4,5}-\d{4}\b/ },
  { name: "cartão", re: /\b(?:\d{4}[ -]){3}\d{4}\b/ },
  { name: "RG", re: /\b\d{2}\.\d{3}\.\d{3}-[0-9X]\b/ },
  { name: "token de provedor", re: /(?:sk_live_|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9]{10,}/ },
];

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(
    (file) =>
      file &&
      !file.startsWith("node_modules/") &&
      (/^(prisma\/seed|scripts\/|.*\.test\.|.*\.spec\.|.*fixture)/.test(file) ||
        file.includes("__tests__")),
  );

const problems: string[] = [];
for (const file of files) {
  let content: string;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const { name, re } of PATTERNS) {
    if (re.test(content)) problems.push(`${file}: possível ${name} real`);
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Dados fictícios OK (12.2): ${files.length} arquivos de seed/teste verificados.`);
}
