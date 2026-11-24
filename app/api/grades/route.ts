import { z } from "zod";
import { EnrollmentService } from "@/app/lib/academic/enrollment-service";
import { GradeService } from "@/app/lib/academic/grade-service";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requirePermission, requireUser } from "@/app/lib/auth/session";
import { SetGradeSchema } from "@/app/types/academic";
import { PERMISSIONS } from "@/app/types/roles";

const QuerySchema = z.object({ classGroupId: z.string().uuid().optional() });

export async function GET(request: Request) {
  try {
    const actor = await requireUser();
    const ctx = actorFrom(actor, request);
    const academicActor = { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress };

    if (actor.roles.includes("ALUNO")) {
      const items = await new EnrollmentService().ownHistory(academicActor);
      return Response.json({ items });
    }

    const { classGroupId } = QuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!classGroupId) {
      return Response.json({ error: "classGroupId é obrigatório" }, { status: 400 });
    }
    const items = await new GradeService().roster(academicActor, classGroupId);
    return Response.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.GRADES_CREATE);
    const input = SetGradeSchema.parse(await request.json());
    const ctx = actorFrom(actor, request);
    await new GradeService().setGrade(
      { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
      input,
    );
    return Response.json({ status: "GRADE_SET" });
  } catch (error) {
    return jsonError(error);
  }
}
