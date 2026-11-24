import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { requirePermission } from "@/app/lib/auth/session";
import { getClientIp } from "@/app/lib/request-context";
import { SubjectRepository } from "@/app/repositories/subject.repository";
import { CreateSubjectSchema } from "@/app/types/academic";
import { PERMISSIONS } from "@/app/types/roles";

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.SUBJECTS_READ);
    const url = new URL(request.url);
    const courseId = url.searchParams.get("courseId") ?? undefined;
    const subjects = await new SubjectRepository().list(
      courseId ? z.string().uuid().parse(courseId) : undefined,
    );
    return Response.json({ items: subjects });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.SUBJECTS_CREATE);
    const input = CreateSubjectSchema.parse(await request.json());
    const repository = new SubjectRepository();

    if (await repository.findByCode(input.code)) {
      return Response.json({ error: "Código de disciplina já existe" }, { status: 409 });
    }

    const subject = await repository.create({
      code: input.code,
      name: input.name,
      periodNumber: input.periodNumber,
      workloadHours: input.workloadHours,
      course: { connect: { id: input.courseId } },
    });

    await createAuditService().record({
      userId: actor.id as never,
      role: actor.roles[0] ?? null,
      ipAddress: getClientIp(request),
      action: AUDIT_ACTIONS.ACADEMIC_RECORD_CREATED,
      module: "SUBJECTS",
      recordType: "Subject",
      recordId: subject.id,
      result: "SUCCESS",
      newValue: { code: subject.code, name: subject.name },
    });
    return Response.json(subject, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
