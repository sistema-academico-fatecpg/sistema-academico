export const instant = false;

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EnrollmentService } from "@/app/lib/academic/enrollment-service";
import { GradeService } from "@/app/lib/academic/grade-service";
import { getAuthenticatedUser } from "@/app/lib/auth/session";
import { ClassGroupRepository } from "@/app/repositories/class-group.repository";
import { PERMISSIONS } from "@/app/types/roles";
import { GradeForm } from "./GradeForm";

export const metadata: Metadata = { title: "Notas" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ classGroupId?: string }>;
}) {
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");
  // 7.3/9.2.3: permissão efetiva do banco antes de listar notas.
  if (!actor.permissions.has(PERMISSIONS.GRADES_READ)) redirect("/dashboard");
  const academicActor = { id: actor.id, roles: actor.roles, ipAddress: "server" };

  if (actor.roles.includes("ALUNO")) {
    const history = await new EnrollmentService().ownHistory(academicActor);
    return (
      <section className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
            Módulo institucional
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Minhas notas</h1>
          <p className="mt-2 text-sm text-slate-500">
            Consulta derivada exclusivamente da sessão autenticada (9.3.1).
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Disciplina</th>
                <th className="px-4 py-3">Nota</th>
                <th className="px-4 py-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr className="border-t border-slate-100" key={item.enrollmentId}>
                  <td className="px-4 py-3">
                    {item.subjectCode} — {item.subjectName}
                  </td>
                  <td className="px-4 py-3">{item.grade ?? "—"}</td>
                  <td className="px-4 py-3">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (actor.roles.includes("PROFESSOR")) {
    const { classGroupId } = await searchParams;
    const classes = new ClassGroupRepository();
    const groups = await classes.listForProfessor(actor.id);
    const roster = classGroupId ? await new GradeService().roster(academicActor, classGroupId) : [];

    return (
      <section className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
            Módulo institucional
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Notas</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Lançamento restrito às suas turmas e à janela definida pelo Admin Master. Fora do
            período, use <code>/api/grades/corrections</code> para solicitar correção com dupla
            aprovação.
          </p>
        </div>
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
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">Nota</th>
                  <th className="px-4 py-3">Lançamento</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((item) => (
                  <tr className="border-t border-slate-100" key={item.enrollmentId}>
                    <td className="px-4 py-3">{item.studentName}</td>
                    <td className="px-4 py-3">{item.registrationNumber ?? "—"}</td>
                    <td className="px-4 py-3">{item.grade ?? "—"}</td>
                    <td className="px-4 py-3">
                      <GradeForm enrollmentId={item.enrollmentId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notas</h1>
      <p className="max-w-3xl text-sm leading-6 text-slate-500">
        O Admin Master define a janela de notas em{" "}
        <a className="underline" href="/periodos">
          /periodos
        </a>{" "}
        e não lança nem edita notas. Consultas e relatórios: <code>/api/exports?scope=GRADES</code>.
      </p>
    </section>
  );
}
