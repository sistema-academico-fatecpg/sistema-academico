import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { requirePermission } from "@/app/lib/auth/session";
import { getClientIp } from "@/app/lib/request-context";
import { CourseRepository } from "@/app/repositories/course.repository";
import { PERMISSIONS } from "@/app/types/roles";

const UpdateCourseSchema = z.object({
  name: z.string().trim().min(3).max(150),
});

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.COURSES_READ);
    const { id } = await ctx.params;
    const course = await new CourseRepository().findById(z.string().uuid().parse(id));
    if (!course) return Response.json({ error: "Curso não encontrado" }, { status: 404 });
    return Response.json(course);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission(PERMISSIONS.COURSES_UPDATE);
    const { id } = await ctx.params;
    const courseId = z.string().uuid().parse(id);
    const input = UpdateCourseSchema.parse(await request.json());
    const repository = new CourseRepository();
    const existing = await repository.findById(courseId);
    if (!existing) return Response.json({ error: "Curso não encontrado" }, { status: 404 });

    const course = await repository.update(courseId, { name: input.name });
    await createAuditService().record({
      userId: actor.id as never,
      role: actor.roles[0] ?? null,
      ipAddress: getClientIp(request),
      action: AUDIT_ACTIONS.ACADEMIC_RECORD_UPDATED,
      module: "COURSES",
      recordType: "Course",
      recordId: course.id,
      oldValue: { name: existing.name },
      newValue: { name: course.name },
      result: "SUCCESS",
    });
    return Response.json(course);
  } catch (error) {
    return jsonError(error);
  }
}
