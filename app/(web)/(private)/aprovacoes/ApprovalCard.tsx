import type { CriticalOperationRequestWithUsers } from "@/app/repositories/critical-operation-request.repository";
import { Badge, Panel } from "@/components";
import { DecisionForm } from "./DecisionForm";
import { isEmergencyRequest, OPERATION_LABELS, requiresDirectionAuthorization } from "./labels";
import styles from "./styles.module.scss";

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
    <Panel padding="p-5" className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <p className={styles.eyebrow}>{OPERATION_LABELS[request.operation]}</p>
          <h2 className={styles.title}>Solicitação de {request.requester.name}</h2>
          <p className={styles.meta}>
            {request.requestedAt.toLocaleString("pt-BR")} · {request.requester.email}
          </p>
        </div>
        <Badge>Pendente</Badge>
      </div>

      <div className={styles.justification}>
        <p className={styles.eyebrow}>Justificativa</p>
        <p className={styles.reason}>{request.reason}</p>
        {request.authorizationDocument ? (
          <p className={styles.document}>
            Documento de autorização: {request.authorizationDocument}
          </p>
        ) : null}
      </div>

      {ownRequest ? (
        <p className={styles.notice}>
          Aguardando decisão de outro aprovador — você não pode aprovar a própria solicitação.
        </p>
      ) : canDecide ? (
        <DecisionForm
          requestId={request.id}
          requiresDirectionAuthorization={requiresDirectionAuthorization(request)}
        />
      ) : (
        <p className={styles.notice}>
          {auditorApproval
            ? "A aprovação desta solicitação cabe ao Auditor."
            : "A aprovação desta solicitação cabe a um Admin Master."}
        </p>
      )}
    </Panel>
  );
}
