import type { SupportAccessGrantRepository } from "@/app/repositories/support-access-grant.repository";
import { Panel } from "@/components/ui/panel";
import { SupportDecisionForm } from "./SupportDecisionForm";

type Grant = Awaited<ReturnType<SupportAccessGrantRepository["list"]>>[number];

export function GrantCard({ grant, canDecide }: { grant: Grant; canDecide: boolean }) {
  return (
    <Panel padding="p-5">
      <p className="text-sm font-semibold">{grant.requester.name}</p>
      <p className="mt-1 text-sm text-slate-600">{grant.reason}</p>
      <p className="mt-2 text-xs text-slate-500">
        {grant.modules.map((item) => item.module).join(", ")} ·{" "}
        {grant.startsAt.toLocaleString("pt-BR")} até {grant.endsAt.toLocaleString("pt-BR")}
      </p>
      {grant.involvesAuditor ? (
        <p className="mt-2 text-xs font-semibold text-amber-700">
          Envolve o Auditor: exige autorização da direção ({grant.authorizationDocument}).
        </p>
      ) : null}
      {canDecide ? (
        <SupportDecisionForm grantId={grant.id} involvesAuditor={grant.involvesAuditor} />
      ) : null}
    </Panel>
  );
}
