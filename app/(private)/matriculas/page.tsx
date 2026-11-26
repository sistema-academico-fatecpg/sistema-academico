export const instant = false;

import type { Metadata } from "next";
import { EnrollmentService } from "@/app/lib/academic/enrollment-service";
import { requirePagePermission } from "@/app/lib/auth/page-guard";
import { PERMISSIONS } from "@/app/types/roles";
import { PageHeader, Panel } from "@/components/ui";
import { StudentEnrollment } from "./StudentEnrollment";

export const metadata: Metadata = { title: "Matrículas" };

export default async function Page() {
  const actor = await requirePagePermission(PERMISSIONS.ENROLLMENTS_READ);

  const service = new EnrollmentService();
  const academicActor = { id: actor.id, roles: actor.roles, ipAddress: "server" };

  if (actor.roles.includes("ALUNO")) {
    const [availableRaw, history] = await Promise.all([
      service.available(academicActor),
      service.ownHistory(academicActor),
    ]);
    const available = [...availableRaw].sort(
      (a, b) => Number(b.isDependency) - Number(a.isDependency),
    );
    return (
      <section className="space-y-6">
        <PageHeader
          title="Matrículas"
          description="A lista mostra apenas as disciplinas do seu período. Havendo DP, ela é obrigatória e as turmas com conflito de horário ficam bloqueadas."
        />
        <StudentEnrollment available={available} history={history} />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Matrículas"
        description={
          <>
            A matrícula é pessoal e feita pelo aluno autenticado. Exceções às regras de DP, período
            ou conflito são registradas por <code>/api/enrollments/exception</code> e só executam
            após dupla aprovação em{" "}
            <a className="underline" href="/aprovacoes">
              /aprovacoes
            </a>
            .
          </>
        }
      />
      <Panel className="text-sm text-slate-600">
        Consultas administrativas: <code>/api/exports?scope=ENROLLMENTS</code>. O identificador do
        aluno nunca é aceito em consultas pessoais fora da sessão.
      </Panel>
    </section>
  );
}
