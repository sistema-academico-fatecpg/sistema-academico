import { jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { requirePermission } from "@/app/lib/auth/session";
import { getClientIp } from "@/app/lib/request-context";
import { AcademicPeriodRepository } from "@/app/repositories/period.repository";
import { CreateAcademicPeriodSchema } from "@/app/types/academic";
import { PERMISSIONS } from "@/app/types/roles";

export async function GET(_request: Request) {
  try {
    await requirePermission(PERMISSIONS.PERIODS_READ);
    const periods = await new AcademicPeriodRepository().list();
    return Response.json({ items: periods });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.PERIODS_CREATE);
    const input = CreateAcademicPeriodSchema.parse(await request.json());
    const period = await new AcademicPeriodRepository().create({
      name: input.name,
      year: input.year,
      semester: input.semester,
      enrollmentOpensAt: new Date(input.enrollmentOpensAt),
      enrollmentClosesAt: new Date(input.enrollmentClosesAt),
      gradesOpenAt: input.gradesOpenAt ? new Date(input.gradesOpenAt) : null,
      gradesCloseAt: input.gradesCloseAt ? new Date(input.gradesCloseAt) : null,
      isCurrent: input.isCurrent,
    });

    await createAuditService().record({
      ...auditActor({ ...actor, ipAddress: getClientIp(request) }),
      action: AUDIT_ACTIONS.ACADEMIC_PERIOD_CREATED,
      module: "PERIODS",
      recordType: "AcademicPeriod",
      recordId: period.id,
      result: "SUCCESS",
      newValue: {
        year: period.year,
        semester: period.semester,
        enrollmentOpensAt: period.enrollmentOpensAt,
        enrollmentClosesAt: period.enrollmentClosesAt,
      },
    });
    return Response.json(period, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
