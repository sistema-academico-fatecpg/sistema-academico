import { EnrollmentService } from "@/app/lib/academic/enrollment-service";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";
import { EnrollSchema } from "@/app/types/academic";

export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    const input = EnrollSchema.parse(await request.json());
    const ctx = actorFrom(actor, request);
    const result = await new EnrollmentService().enroll(
      { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
      input.classGroupIds,
    );
    return Response.json({ status: "ENROLLED", ...result }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
