import Link from "next/link";
import type { ProfessorRosterItem } from "@/app/lib/academic/grade-service";
import { PageHeader } from "@/components";
import { GradeRosterForm } from "./GradeRosterForm";
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
      {classGroupId ? <GradeRosterForm key={classGroupId} roster={roster} /> : null}
    </section>
  );
}
