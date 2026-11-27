import type { SupportAccessGrantRepository } from "@/app/repositories/support-access-grant.repository";
import { Badge, Icon, Panel } from "@/components";
import { SupportDecisionForm } from "./SupportDecisionForm";
import styles from "./styles.module.scss";

type Grant = Awaited<ReturnType<SupportAccessGrantRepository["list"]>>[number];

export function GrantCard({ grant, canDecide }: { grant: Grant; canDecide: boolean }) {
  return (
    <Panel padding="p-5">
      <div className={styles.cardHead}>
        <p className={styles.grantRequester}>{grant.requester.name}</p>
        <Badge>Pendente</Badge>
      </div>
      <p className={styles.grantReason}>{grant.reason}</p>
      <p className={styles.grantMeta}>
        {grant.modules.map((item) => item.module).join(", ")} ·{" "}
        {grant.startsAt.toLocaleString("pt-BR")} até {grant.endsAt.toLocaleString("pt-BR")}
      </p>
      {grant.involvesAuditor ? (
        <p className={styles.grantWarning}>
          <Icon name="alert" size="sm" /> Envolve o Auditor: exige autorização da direção (
          {grant.authorizationDocument}).
        </p>
      ) : null}
      {canDecide ? (
        <SupportDecisionForm grantId={grant.id} involvesAuditor={grant.involvesAuditor} />
      ) : null}
    </Panel>
  );
}
