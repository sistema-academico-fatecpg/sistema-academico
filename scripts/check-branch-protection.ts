import { execFileSync } from "node:child_process";

/**
 * 12.5: code review obrigatório antes da publicação. Verifica via GitHub CLI
 * se a branch principal exige PR com revisão e checks obrigatórios.
 * Não bloqueia quando o repositório não é acessível (fork/sem token).
 */
const REQUIRED_CHECKS = [
  "biome / Biome check",
  "typecheck / Typecheck",
  "tests / Tests",
  "build / Build",
];

function main() {
  let raw: string;
  try {
    raw = execFileSync("gh", ["api", "repos/{owner}/{repo}/branches/main/protection"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    console.log("Aviso: não foi possível consultar branch protection (token/permissão ausente).");
    console.log("Configure manualmente: PR obrigatório, 1 aprovação e status checks do CI.");
    return;
  }

  let protection: {
    required_pull_request_reviews?: { required_approving_review_count?: number };
    required_status_checks?: { contexts?: string[] };
  };
  try {
    protection = JSON.parse(raw);
  } catch {
    console.log("Aviso: resposta inválida da API de branch protection.");
    return;
  }

  const approvals = protection.required_pull_request_reviews?.required_approving_review_count ?? 0;
  const contexts = protection.required_status_checks?.contexts ?? [];
  const missing = REQUIRED_CHECKS.filter((check) => !contexts.includes(check));
  const problems: string[] = [];
  if (approvals < 1) problems.push("revisão de PR obrigatória não configurada");
  if (missing.length > 0) problems.push(`checks obrigatórios ausentes: ${missing.join(", ")}`);

  if (problems.length > 0) {
    console.error(problems.join("\n"));
    // Não bloqueia por padrão: a proteção de branch é configurada pelo
    // administrador do repositório. Use REQUIRE_BRANCH_PROTECTION=1 para exigir.
    if (process.env.REQUIRE_BRANCH_PROTECTION === "1") process.exitCode = 1;
    else console.log("Aviso: configure a proteção da branch main (12.5).");
  } else {
    console.log(
      `Code review OK (12.5): ${approvals} aprovação(ões) e ${contexts.length} checks obrigatórios.`,
    );
  }
}

main();
