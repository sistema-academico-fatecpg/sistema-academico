import type { MasterStatus } from "@/app/lib/critical-operations/service";
import { AlertBanner } from "@/components";
import styles from "./styles.module.scss";

/** 8.1.2 / 8.8: recomendação de 3 Masters e modo de conta única. */
export function MasterModeBanner({ status }: { status: MasterStatus }) {
  if (!status.singleAccountMode) {
    if (!status.belowRecommendation) return null;
    return (
      <AlertBanner tone="info">
        Recomenda-se manter {status.recommendedMasters} contas Admin Master (8.1.2); atualmente há{" "}
        {status.activeMasters}. Isso mantém a dupla aprovação possível em férias e afastamentos.
      </AlertBanner>
    );
  }

  return (
    <AlertBanner tone="warning" title="Modo de conta única">
      Há {status.activeMasters} Admin Master ativo. As operações críticas estão suspensas, exceto a
      inclusão de um novo Master, que deve ser aprovada pelo Auditor (seção 8.8).
      {status.directionDeadline ? (
        <p className={styles.deadline}>
          Prazo da direção (5 dias úteis):{" "}
          {new Date(status.directionDeadline).toLocaleString("pt-BR")}
          {status.directionDeadlineOverdue ? " — ATRASADO" : ""}
        </p>
      ) : null}
    </AlertBanner>
  );
}
