import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { requirePermission } from "@/app/lib/auth/session";
import { getClientIp } from "@/app/lib/request-context";
import { AcademicPeriodRepository } from "@/app/repositories/period.repository";
import { PERMISSIONS } from "@/app/types/roles";

const UpdatePeriodSchema = z
  .object({
    name: z.string().trim().min(3).max(120).optional(),
    enrollmentOpensAt: z.string().datetime().optional(),
    enrollmentClosesAt: z.string().datetime().optional(),
    gradesOpenAt: z.string().datetime().nullable().optional(),
    gradesCloseAt: z.string().datetime().nullable().optional(),
    isCurrent: z.boolean().optional(),
    closeGradesNow: z.boolean().optional(),
  })
  .refine(
    (value) =>
      !value.gradesOpenAt ||
      !value.gradesCloseAt ||
      new Date(value.gradesOpenAt) < new Date(value.gradesCloseAt),
    { message: "Abertura das notas deve ser anterior ao fechamento", path: ["gradesCloseAt"] },
  );

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission(PERMISSIONS.PERIODS_UPDATE);
    const { id } = await ctx.params;
    const periodId = z.string().uuid().parse(id);
    const input = UpdatePeriodSchema.parse(await request.json());
    const repository = new AcademicPeriodRepository();
    const existing = await repository.findById(periodId);
    if (!existing) return Response.json({ error: "Período não encontrado" }, { status: 404 });

    let period = existing;
    if (input.isCurrent) period = await repository.setCurrent(periodId);

    if (input.closeGradesNow) {
      period = await repository.closeGrades(periodId);
    } else if (input.gradesOpenAt !== undefined || input.gradesCloseAt !== undefined) {
      period = await repository.setGradesWindow(
        periodId,
        input.gradesOpenAt === undefined
          ? existing.gradesOpenAt
          : input.gradesOpenAt
            ? new Date(input.gradesOpenAt)
            : null,
        input.gradesCloseAt === undefined
          ? existing.gradesCloseAt
          : input.gradesCloseAt
            ? new Date(input.gradesCloseAt)
            : null,
      );
    }

    if (
      input.name !== undefined ||
      input.enrollmentOpensAt !== undefined ||
      input.enrollmentClosesAt !== undefined
    ) {
      period = await repository.update(periodId, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.enrollmentOpensAt !== undefined
          ? { enrollmentOpensAt: new Date(input.enrollmentOpensAt) }
          : {}),
        ...(input.enrollmentClosesAt !== undefined
          ? { enrollmentClosesAt: new Date(input.enrollmentClosesAt) }
          : {}),
      });
    }

    await createAuditService().record({
      ...auditActor({ ...actor, ipAddress: getClientIp(request) }),
      action: input.closeGradesNow
        ? AUDIT_ACTIONS.GRADES_PERIOD_CLOSED
        : AUDIT_ACTIONS.GRADES_PERIOD_UPDATED,
      module: "PERIODS",
      recordType: "AcademicPeriod",
      recordId: period.id,
      oldValue: {
        gradesOpenAt: existing.gradesOpenAt,
        gradesCloseAt: existing.gradesCloseAt,
        isCurrent: existing.isCurrent,
      },
      newValue: {
        gradesOpenAt: period.gradesOpenAt,
        gradesCloseAt: period.gradesCloseAt,
        isCurrent: period.isCurrent,
      },
      result: "SUCCESS",
    });

    return Response.json(period);
  } catch (error) {
    return jsonError(error);
  }
}
