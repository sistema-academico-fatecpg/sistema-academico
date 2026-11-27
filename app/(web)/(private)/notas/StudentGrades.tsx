import type { StudentGradeDto } from "@/app/types/academic";
import { DataTable, PageHeader } from "@/components";
import styles from "./styles.module.scss";

export function StudentGrades({ history }: { history: StudentGradeDto[] }) {
  return (
    <section className={styles.page}>
      <PageHeader
        title="Minhas notas"
        description="Consulta derivada exclusivamente da sessão autenticada (9.3.1)."
      />
      <DataTable
        columns={[
          {
            key: "subject",
            header: "Disciplina",
            render: (row) => `${row.subjectCode} — ${row.subjectName}`,
          },
          { key: "grade", header: "Nota", render: (row) => row.grade ?? "-" },
          { key: "status", header: "Situação" },
        ]}
        rows={history}
        rowKey={(row) => row.enrollmentId}
        emptyMessage="Nenhuma nota disponível."
      />
    </section>
  );
}
