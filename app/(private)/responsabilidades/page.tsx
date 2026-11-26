export const instant = false;

import type { Metadata } from "next";
import { requirePageUser } from "@/app/lib/auth/page-guard";
import { policyReviewReport } from "@/app/lib/security/compliance-service";
import { AlertBanner, DataTable, PageHeader } from "@/components/ui";

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
  await requirePageUser();
  const review = await policyReviewReport();

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Institucional"
        title="Responsabilidades e vigência"
        description="Seções 14–16 da Política de Segurança. A política é revisada anualmente ou após incidente relevante / alteração legal."
      />

      <AlertBanner tone={review.overdue ? "warning" : "success"}>
        <p className="font-semibold">
          {review.overdue ? "Revisão da política pendente" : "Revisão da política em dia"}
        </p>
        <p>
          Última: {review.lastReviewedAt ?? "nunca"} · Próxima:{" "}
          {review.nextReviewAt ?? "não agendada"}
        </p>
        {review.relevantIncidentSinceLastReview ? (
          <p>
            Incidente relevante desde a última revisão: {review.relevantIncidentSinceLastReview}
          </p>
        ) : null}
      </AlertBanner>

      <DataTable
        columns={[
          {
            key: "role",
            header: "Responsável",
            render: ([role]) => (
              <span className="whitespace-nowrap font-semibold text-slate-800">{role}</span>
            ),
          },
          {
            key: "duties",
            header: "Atribuições",
            render: ([, duties]) => <span className="text-slate-600">{duties}</span>,
          },
        ]}
        rows={RESPONSIBILITIES}
        rowKey={([role]) => role}
      />

      <p className="text-xs text-slate-500">
        Registro de revisões: <code>/api/compliance/policy-review</code> · Descumprimentos:{" "}
        <code>/api/compliance/violations</code> · Desenvolvimento: <code>pnpm policy:review</code>
      </p>
    </section>
  );
}
