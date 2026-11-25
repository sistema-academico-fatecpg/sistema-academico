import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { requirePermission } from "@/app/lib/auth/session";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { getClientIp } from "@/app/lib/request-context";
import { PERMISSIONS } from "@/app/types/roles";

const BodySchema = z.object({
  studentId: z.string().uuid(),
  classGroupId: z.string().uuid(),
  isDependency: z.boolean().default(false),
  justification: z.string().trim().min(10).max(1000),
});

/** 9.1.4: exceções às regras de matrícula exigem dupla aprovação (7.5). */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.ENROLLMENTS_UPDATE);
    const body = BodySchema.parse(await request.json());
    const created = await new CriticalOperationService().request(
      {
        id: actor.id,
        roles: actor.roles,
        ipAddress: getClientIp(request),
        permissions: actor.permissions,
      },
      {
        operation: "ENROLLMENT_RULE_EXCEPTION",
        module: "ENROLLMENTS",
        recordType: "Enrollment",
        recordId: body.classGroupId,
        reason: body.justification,
        payload: {
          studentId: body.studentId,
          classGroupId: body.classGroupId,
          isDependency: body.isDependency,
          justification: body.justification,
        },
      },
    );
    // 10.2: matrículas e exceções são eventos registrados explicitamente.
    await createAuditService().record({
      userId: actor.id as never,
      role: actor.roles[0] ?? null,
      ipAddress: getClientIp(request),
      action: AUDIT_ACTIONS.ENROLLMENT_EXCEPTION_REQUESTED,
      module: "ENROLLMENTS",
      recordType: "CriticalOperationRequest",
      recordId: created.id,
      result: "SUCCESS",
      newValue: { studentId: body.studentId, classGroupId: body.classGroupId },
    });
    return Response.json({ status: "PENDING_APPROVAL", requestId: created.id }, { status: 202 });
  } catch (error) {
    return jsonError(error);
  }
}
