export const instant = false;

import type { Metadata } from "next";
import { EnrollmentService } from "@/app/lib/academic/enrollment-service";
import { GradeService } from "@/app/lib/academic/grade-service";
import { requirePagePermission } from "@/app/lib/auth/page-guard";
import { ClassGroupRepository } from "@/app/repositories/class-group.repository";
import { PERMISSIONS } from "@/app/types/roles";
import { PageHeader } from "@/components/ui";
import { ProfessorRoster } from "./ProfessorRoster";
import { StudentGrades } from "./StudentGrades";

export const metadata: Metadata = { title: "Notas" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ classGroupId?: string }>;
}) {
  const actor = await requirePagePermission(PERMISSIONS.GRADES_READ);
  const academicActor = { id: actor.id, roles: actor.roles, ipAddress: "server" };

  if (actor.roles.includes("ALUNO")) {
    const history = await new EnrollmentService().ownHistory(academicActor);
    return <StudentGrades history={history} />;
  }

  if (actor.roles.includes("PROFESSOR")) {
    const { classGroupId } = await searchParams;
    const groups = await new ClassGroupRepository().listForProfessor(actor.id);
    const roster = classGroupId ? await new GradeService().roster(academicActor, classGroupId) : [];
    return <ProfessorRoster groups={groups} classGroupId={classGroupId} roster={roster} />;
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Notas"
        description={
          <>
            O Admin Master define a janela de notas em{" "}
            <a className="underline" href="/periodos">
              /periodos
            </a>{" "}
            e não lança nem edita notas. Consultas e relatórios:{" "}
            <code>/api/exports?scope=GRADES</code>.
          </>
        }
      />
    </section>
  );
}
