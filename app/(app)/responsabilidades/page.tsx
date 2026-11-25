export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth/session";
import { policyReviewReport } from "@/app/lib/security/compliance-service";

export const metadata: Metadata = { title: "Responsabilidades e vigência" };

const RESPONSIBILITIES = [
  [
    "Admin Master",
    "Gerenciar permissões, definir períodos de notas, aprovar operações críticas e revisar acessos semestralmente.",
  ],
  [
    "Admin Secundário",
    "Cadastrar e manter usuários, bloquear desligados e registrar consentimento de responsáveis.",
  ],
  [
    "Direção / RH",
    "Comunicar desligamentos e autorizar formalmente inclusões de Master em contingência.",
  ],
  [
    "Professor",
    "Lançar notas corretas no prazo, proteger dados dos alunos e não compartilhar credenciais.",
  ],
  ["Aluno", "Manter a senha em sigilo, comunicar acesso estranho e exercer direitos LGPD."],
  [
    "Auditor",
    "Acompanhar logs/alertas, apurar incidentes, aprovar acessos excepcionais, restaurações e revisar ações emergenciais.",
  ],
  [
    "Equipe de Desenvolvimento",
    "Implementar a política, manter CI/testes e entregar relatório; sem credencial em produção.",
  ],
  [
    "Equipe de Infraestrutura",
    "Executar/testar backups, custodiar chaves, manter servidores/NTP e registrar contas Master.",
  ],
  [
    "Encarregado de Dados (DPO)",
    "Garantir LGPD, atender titulares e comunicar incidentes à ANPD e aos titulares.",
  ],
] as const;

export default async function Page() {
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");

  const review = await policyReviewReport();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
          Institucional
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Responsabilidades e vigência
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Seções 14–16 da Política de Segurança. A política é revisada anualmente ou após incidente
          relevante / alteração legal.
        </p>
      </div>

      <div
        className={`rounded-2xl border p-5 ${review.overdue ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
      >
        <p className="text-sm font-semibold">
          {review.overdue ? "Revisão da política pendente" : "Revisão da política em dia"}
        </p>
        <p className="mt-1 text-sm">
          Última: {review.lastReviewedAt ?? "nunca"} · Próxima:{" "}
          {review.nextReviewAt ?? "não agendada"}
        </p>
        {review.relevantIncidentSinceLastReview ? (
          <p className="mt-1 text-sm">
            Incidente relevante desde a última revisão: {review.relevantIncidentSinceLastReview}
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Atribuições</th>
            </tr>
          </thead>
          <tbody>
            {RESPONSIBILITIES.map(([role, duties]) => (
              <tr className="border-t border-slate-100" key={role}>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{role}</td>
                <td className="px-4 py-3 text-slate-600">{duties}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Registro de revisões: <code>/api/compliance/policy-review</code> · Descumprimentos:{" "}
        <code>/api/compliance/violations</code> · Desenvolvimento: <code>pnpm policy:review</code>
      </p>
    </section>
  );
}
