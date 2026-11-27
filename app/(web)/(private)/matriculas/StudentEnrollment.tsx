import type { ClassGroupDto, StudentGradeDto } from "@/app/types/academic";
import { DataTable, Panel } from "@/components";
import { EnrollmentForm } from "./EnrollmentForm";
import styles from "./styles.module.scss";

export function StudentEnrollment({
  available,
  history,
}: {
  available: ClassGroupDto[];
  history: StudentGradeDto[];
}) {
  return (
    <div className={styles.stack}>
      <Panel>
        <h2 className={styles.heading}>Turmas disponíveis</h2>
        <div className={styles.panelBody}>
          <EnrollmentForm items={available} />
        </div>
      </Panel>
      <Panel>
        <h2 className={styles.heading}>Histórico</h2>
        <div className={styles.panelBody}>
          <DataTable
            columns={[
              {
                key: "subject",
                header: "Disciplina",
                render: (row: StudentGradeDto) => `${row.subjectCode} — ${row.subjectName}`,
              },
              { key: "grade", header: "Nota", render: (row: StudentGradeDto) => row.grade ?? "-" },
              { key: "status", header: "Situação" },
            ]}
            rows={history}
            rowKey={(row) => row.enrollmentId}
            emptyMessage="Nenhuma matrícula."
          />
        </div>
      </Panel>
    </div>
  );
}
