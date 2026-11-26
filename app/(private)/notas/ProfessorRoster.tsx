import Link from "next/link";
import type { ProfessorRosterItem } from "@/app/lib/academic/grade-service";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { GradeForm } from "./GradeForm";

type ClassGroupLink = {
  id: string;
  subject: { code: string; name: string };
};

export function ProfessorRoster({
  groups,
  classGroupId,
  roster,
}: {
  groups: ClassGroupLink[];
  classGroupId?: string;
  roster: ProfessorRosterItem[];
}) {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Notas"
        description={
          <>
            Lançamento restrito às suas turmas e à janela definida pelo Admin Master. Fora do
            período, use <code>/api/grades/corrections</code> para solicitar correção com dupla
            aprovação.
          </>
        }
      />
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <Link
            className={`rounded-lg border px-3 py-2 text-sm ${
              classGroupId === group.id
                ? "border-[#6b1720] bg-rose-50 text-[#6b1720]"
                : "border-slate-200 bg-white"
            }`}
            href={`/notas?classGroupId=${group.id}`}
            key={group.id}
          >
            {group.subject.code} — {group.subject.name}
          </Link>
        ))}
      </div>
      {classGroupId ? (
        <DataTable
          columns={[
            { key: "studentName", header: "Aluno" },
            {
              key: "registrationNumber",
              header: "Matrícula",
              render: (row) => row.registrationNumber ?? "—",
            },
            { key: "grade", header: "Nota", render: (row) => row.grade ?? "—" },
            {
              key: "launch",
              header: "Lançamento",
              render: (row) => <GradeForm enrollmentId={row.enrollmentId} />,
            },
          ]}
          rows={roster}
          rowKey={(row) => row.enrollmentId}
          emptyMessage="Nenhum aluno nesta turma."
        />
      ) : null}
    </section>
  );
}
