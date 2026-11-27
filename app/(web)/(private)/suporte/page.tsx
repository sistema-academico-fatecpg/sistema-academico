export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/app/lib/auth/page-guard";
import { SupportAccessGrantRepository } from "@/app/repositories/support-access-grant.repository";
import { PERMISSIONS } from "@/app/types/roles";
import { PageHeader, Panel } from "@/components";
import { GrantCard } from "./GrantCard";
import { SupportRequestForm } from "./SupportRequestForm";
import styles from "./styles.module.scss";

export const metadata: Metadata = { title: "Acesso de suporte" };

export default async function Page() {
  const actor = await requirePageUser();
  const isAuditor = actor.roles.includes("AUDITOR");
  const isSupport = actor.roles.includes("SUPORTE_TECNICO");
  if (!isAuditor && !isSupport) redirect("/dashboard");
  if (isAuditor && !actor.permissions.has(PERMISSIONS.AUDIT_LOGS_READ)) {
    redirect("/dashboard");
  }

  // 7.3: Suporte Técnico só vê as próprias solicitações; Auditor vê todas.
  const allGrants = await new SupportAccessGrantRepository().list();
  const grants = isAuditor
    ? allGrants
    : allGrants.filter((grant) => grant.requestedBy === actor.id);
  const pending = grants.filter((grant) => grant.status === "PENDING");

  return (
    <section className={styles.page}>
      <PageHeader
        title="Acesso excepcional de suporte"
        description="Sem permissão permanente: somente leitura, no escopo aprovado, por no máximo 8 horas e com revogação automática (10.8)."
      />

      {isSupport ? (
        <Panel>
          <h2 className={styles.sectionTitle}>Nova solicitação</h2>
          <div className={styles.formWrap}>
            <SupportRequestForm />
          </div>
        </Panel>
      ) : null}

      <div className={styles.pending}>
        <h2 className={styles.sectionTitle}>Solicitações pendentes</h2>
        <div className={styles.grantList}>
          {pending.map((grant) => (
            <GrantCard key={grant.id} grant={grant} canDecide={isAuditor} />
          ))}
        </div>
        {pending.length === 0 ? (
          <Panel padding="p-5" className={styles.empty}>
            Nenhuma solicitação pendente.
          </Panel>
        ) : null}
      </div>
    </section>
  );
}
