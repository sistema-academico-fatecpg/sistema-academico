export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth/session";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { CriticalOperationRequestRepository } from "@/app/repositories/critical-operation-request.repository";
import type { CriticalOperationType } from "@/app/types/common";
import { PERMISSIONS } from "@/app/types/roles";
import { DecisionForm } from "./DecisionForm";

export const metadata: Metadata = { title: "Operações críticas" };

const OPERATION_LABELS: Record<CriticalOperationType, string> = {
  GRANT_REVOKE_ADMIN_PERMISSION: "Conceder/revogar perfil administrativo",
  INCLUDE_OR_REPLACE_ADMIN_MASTER: "Incluir/substituir Admin Master",
  GRADE_CORRECTION_AFTER_CLOSING: "Correção de nota após fechamento",
  ENROLLMENT_RULE_EXCEPTION: "Exceção às regras de matrícula",
  ACADEMIC_RECORD_DELETION: "Exclusão de registro acadêmico",
  MASS_PERSONAL_DATA_EXPORT: "Exportação em massa de dados pessoais",
  DATA_RESTORE_AFTER_INCIDENT: "Restauração de dados após incidente",
  RESET_SECOND_FACTOR: "Redefinição de segundo fator",
};

function isEmergency(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  return (payload as Record<string, unknown>).emergency === true;
}

function requiresDirectionAuthorization(request: { operation: string; payload: unknown }): boolean {
  if (request.operation !== "DATA_RESTORE_AFTER_INCIDENT") return false;
  if (!request.payload || typeof request.payload !== "object" || Array.isArray(request.payload)) {
    return false;
  }
  return (request.payload as Record<string, unknown>).involvesMaster === true;
}

export default async function Page() {
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");
  // 7.3: a tela de aprovações exige a permissão efetiva do banco.
  if (!actor.permissions.has(PERMISSIONS.ROLES_APPROVE)) redirect("/dashboard");

  const service = new CriticalOperationService();
  const [pending, masterStatus] = await Promise.all([
    new CriticalOperationRequestRepository().findPendingIncludingOwn(actor.id),
    service.masterStatus(),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
          Módulo institucional
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Operações críticas
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          A permissão define quem pode solicitar; a dupla aprovação define quando a operação é
          executada. O solicitante nunca aprova a própria solicitação.
        </p>
      </div>

      {masterStatus.belowRecommendation && !masterStatus.singleAccountMode ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Recomenda-se manter {masterStatus.recommendedMasters} contas Admin Master (8.1.2);
          atualmente há {masterStatus.activeMasters}. Isso mantém a dupla aprovação possível em
          férias e afastamentos.
        </div>
      ) : null}

      {masterStatus.singleAccountMode ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <p className="font-semibold text-amber-900">Modo de conta única</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Há {masterStatus.activeMasters} Admin Master ativo. As operações críticas estão
            suspensas, exceto a inclusão de um novo Master, que deve ser aprovada pelo Auditor
            (seção 8.8).
          </p>
          {masterStatus.directionDeadline ? (
            <p className="mt-1 text-sm font-semibold text-amber-900">
              Prazo da direção (5 dias úteis):{" "}
              {new Date(masterStatus.directionDeadline).toLocaleString("pt-BR")}
              {masterStatus.directionDeadlineOverdue ? " — ATRASADO" : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        {pending.map((request) => {
          const ownRequest = request.requestedBy === actor.id;
          const masterInclusion = request.operation === "INCLUDE_OR_REPLACE_ADMIN_MASTER";
          const auditorApproval =
            masterInclusion && (masterStatus.singleAccountMode || isEmergency(request.payload));
          const canDecide =
            !ownRequest &&
            (auditorApproval
              ? actor.roles.includes("AUDITOR")
              : actor.roles.includes("ADMIN_MASTER"));

          return (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              key={request.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {OPERATION_LABELS[request.operation]}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    Solicitação de {request.requester.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {request.requestedAt.toLocaleString("pt-BR")} · {request.requester.email}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  Pendente
                </span>
              </div>

              <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Justificativa
                </p>
                <p className="mt-1 whitespace-pre-wrap">{request.reason}</p>
                {request.authorizationDocument ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Documento de autorização: {request.authorizationDocument}
                  </p>
                ) : null}
              </div>

              {ownRequest ? (
                <p className="mt-3 text-sm font-medium text-slate-500">
                  Aguardando decisão de outro aprovador — você não pode aprovar a própria
                  solicitação.
                </p>
              ) : canDecide ? (
                <DecisionForm
                  requestId={request.id}
                  requiresDirectionAuthorization={requiresDirectionAuthorization(request)}
                />
              ) : (
                <p className="mt-3 text-sm font-medium text-slate-500">
                  {auditorApproval
                    ? "A aprovação desta solicitação cabe ao Auditor."
                    : "A aprovação desta solicitação cabe a um Admin Master."}
                </p>
              )}
            </article>
          );
        })}
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Nenhuma solicitação pendente.
          </div>
        ) : null}
      </div>
    </section>
  );
}
