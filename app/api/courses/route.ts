import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { requirePermission } from "@/app/lib/auth/session";
import { getClientIp } from "@/app/lib/request-context";
import { CourseRepository } from "@/app/repositories/course.repository";
import { CreateCourseSchema } from "@/app/types/academic";
import { PERMISSIONS } from "@/app/types/roles";

export async function GET(_request: Request) {
  try {
    await requirePermission(PERMISSIONS.COURSES_READ);
    const courses = await new CourseRepository().list();
    return Response.json({ items: courses });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.COURSES_CREATE);
    const input = CreateCourseSchema.parse(await request.json());
    const repository = new CourseRepository();

    if (await repository.findByCode(input.code)) {
      return Response.json({ error: "Código de curso já existe" }, { status: 409 });
    }

    const course = await repository.create(input);
    await createAuditService().record({
      userId: actor.id as never,
      role: actor.roles[0] ?? null,
      ipAddress: getClientIp(request),
      action: AUDIT_ACTIONS.ACADEMIC_RECORD_CREATED,
      module: "COURSES",
      recordType: "Course",
      recordId: course.id,
      result: "SUCCESS",
      newValue: { code: course.code, name: course.name },
    });
    return Response.json(course, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

const IdSchema = z.string().uuid();

export { IdSchema };
