export const instant = false;

import type { Metadata } from "next";
import { requirePagePermission } from "@/app/lib/auth/page-guard";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { CriticalOperationRequestRepository } from "@/app/repositories/critical-operation-request.repository";
import { PERMISSIONS } from "@/app/types/roles";
import { PageHeader, Panel } from "@/components/ui";
import { ApprovalCard } from "./ApprovalCard";
import { MasterModeBanner } from "./MasterModeBanner";

export const metadata: Metadata = { title: "Operações críticas" };

export default async function Page() {
  const actor = await requirePagePermission(PERMISSIONS.ROLES_APPROVE);

  const service = new CriticalOperationService();
  const [pending, masterStatus] = await Promise.all([
    new CriticalOperationRequestRepository().findPendingIncludingOwn(actor.id),
    service.masterStatus(),
  ]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Operações críticas"
        description="A permissão define quem pode solicitar; a dupla aprovação define quando a operação é executada. O solicitante nunca aprova a própria solicitação."
      />
      <MasterModeBanner status={masterStatus} />
      <div className="space-y-4">
        {pending.map((request) => (
          <ApprovalCard
            key={request.id}
            request={request}
            actorId={actor.id}
            actorRoles={actor.roles}
            singleAccountMode={masterStatus.singleAccountMode}
          />
        ))}
        {pending.length === 0 ? (
          <Panel padding="p-8" className="text-center text-sm text-slate-500">
            Nenhuma solicitação pendente.
          </Panel>
        ) : null}
      </div>
    </section>
  );
}
