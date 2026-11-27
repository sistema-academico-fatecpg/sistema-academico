import Link from "next/link";
import type { ProfessorRosterItem } from "@/app/lib/academic/grade-service";
import { DataTable, PageHeader } from "@/components";
import { GradeForm } from "./GradeForm";
import styles from "./styles.module.scss";

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
    <section className={styles.page}>
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
      <div className={styles.groupLinks}>
        {groups.map((group) => (
          <Link
            className={
              classGroupId === group.id
                ? `${styles.classLink} ${styles.classLinkActive}`
                : styles.classLink
            }
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
            { key: "grade", header: "Nota", render: (row) => row.grade ?? "-" },
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
