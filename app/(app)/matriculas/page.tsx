export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EnrollmentService } from "@/app/lib/academic/enrollment-service";
import { getAuthenticatedUser } from "@/app/lib/auth/session";
import { PERMISSIONS } from "@/app/types/roles";
import { EnrollmentForm } from "./EnrollmentForm";

export const metadata: Metadata = { title: "Matrículas" };

export default async function Page() {
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");
  // 7.3/9.1.1: permissão efetiva do banco antes de tocar no serviço.
  if (!actor.permissions.has(PERMISSIONS.ENROLLMENTS_READ)) redirect("/dashboard");

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
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
            Módulo institucional
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Matrículas</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            A lista mostra apenas as disciplinas do seu período. Havendo DP, ela é obrigatória e as
            turmas com conflito de horário ficam bloqueadas.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Turmas disponíveis</h2>
          <div className="mt-4">
            <EnrollmentForm items={available} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
          Módulo institucional
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Matrículas</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          A matrícula é pessoal e feita pelo aluno autenticado. Exceções às regras de DP, período ou
          conflito são registradas por <code>/api/enrollments/exception</code> e só executam após
          dupla aprovação em{" "}
          <a className="underline" href="/aprovacoes">
            /aprovacoes
          </a>
          .
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Consultas administrativas: <code>/api/exports?scope=ENROLLMENTS</code>. O identificador do
        aluno nunca é aceito em consultas pessoais fora da sessão.
      </div>
    </section>
  );
}
