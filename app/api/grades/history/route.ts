import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { forbidden } from "@/app/lib/auth/errors";
import { requireUser } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db";
import { GradeRepository } from "@/app/repositories/grade.repository";

const QuerySchema = z.object({ enrollmentId: z.string().uuid() });

/** 9.2.4: histórico de cada alteração, com vínculo verificado no servidor. */
export async function GET(request: Request) {
  try {
    const actor = await requireUser();
    const { enrollmentId } = QuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { classGroup: { select: { professorId: true } } },
    });
    if (!enrollment) {
      return Response.json({ error: "Matrícula não encontrada" }, { status: 404 });
    }

    const isOwner = actor.roles.includes("ALUNO") && enrollment.studentId === actor.id;
    const isBoundProfessor =
      actor.roles.includes("PROFESSOR") && enrollment.classGroup.professorId === actor.id;
    const isAuditor = actor.roles.includes("AUDITOR") || actor.roles.includes("ADMIN_MASTER");
    if (!isOwner && !isBoundProfessor && !isAuditor) {
      throw forbidden("Sem vínculo com este registro");
    }

    const items = await new GradeRepository().historyForEnrollment(enrollmentId);
    return Response.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}
