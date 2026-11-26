import type { ClassGroupDto, StudentGradeDto } from "@/app/types/academic";
import { Panel } from "@/components/ui/panel";
import { EnrollmentForm } from "./EnrollmentForm";

export function StudentEnrollment({
  available,
  history,
}: {
  available: ClassGroupDto[];
  history: StudentGradeDto[];
}) {
  return (
    <>
      <Panel>
        <h2 className="font-semibold text-slate-900">Turmas disponíveis</h2>
        <div className="mt-4">
          <EnrollmentForm items={available} />
        </div>
      </Panel>
      <Panel>
        <h2 className="font-semibold text-slate-900">Histórico</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {history.map((item) => (
            <li
              className="flex justify-between border-b border-slate-100 py-2"
              key={item.enrollmentId}
            >
              <span>
                {item.subjectCode} — {item.subjectName}
              </span>
              <span className="text-slate-500">
                {item.grade ?? "—"} · {item.status}
              </span>
            </li>
          ))}
          {history.length === 0 ? <li className="text-slate-500">Nenhuma matrícula.</li> : null}
        </ul>
      </Panel>
    </>
  );
}
