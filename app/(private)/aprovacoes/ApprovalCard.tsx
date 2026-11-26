import type { CriticalOperationRequestWithUsers } from "@/app/repositories/critical-operation-request.repository";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { DecisionForm } from "./DecisionForm";
import { isEmergencyRequest, OPERATION_LABELS, requiresDirectionAuthorization } from "./labels";

export function ApprovalCard({
  request,
  actorId,
  actorRoles,
  singleAccountMode,
}: {
  request: CriticalOperationRequestWithUsers;
  actorId: string;
  actorRoles: readonly string[];
  singleAccountMode: boolean;
}) {
  const ownRequest = request.requestedBy === actorId;
  const masterInclusion = request.operation === "INCLUDE_OR_REPLACE_ADMIN_MASTER";
  const auditorApproval =
    masterInclusion && (singleAccountMode || isEmergencyRequest(request.payload));
  const canDecide =
    !ownRequest &&
    (auditorApproval ? actorRoles.includes("AUDITOR") : actorRoles.includes("ADMIN_MASTER"));

  return (
    <Panel padding="p-5" className="space-y-3">
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
        <Badge>Pendente</Badge>
      </div>

      <div className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
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
        <p className="text-sm font-medium text-slate-500">
          Aguardando decisão de outro aprovador — você não pode aprovar a própria solicitação.
        </p>
      ) : canDecide ? (
        <DecisionForm
          requestId={request.id}
          requiresDirectionAuthorization={requiresDirectionAuthorization(request)}
        />
      ) : (
        <p className="text-sm font-medium text-slate-500">
          {auditorApproval
            ? "A aprovação desta solicitação cabe ao Auditor."
            : "A aprovação desta solicitação cabe a um Admin Master."}
        </p>
      )}
    </Panel>
  );
}
