import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma/client";
import { jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { conflict, notFound, validationError } from "@/app/lib/auth/errors";
import { requirePermission } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db";
import { getClientIp } from "@/app/lib/request-context";
import { ClassGroupRepository } from "@/app/repositories/class-group.repository";
import { UserRepository } from "@/app/repositories/user.repository";
import { UpdateClassGroupSchema } from "@/app/types/academic";
import { PERMISSIONS } from "@/app/types/roles";

const ParamsSchema = z.object({ id: z.string().uuid() });

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission(PERMISSIONS.CLASSES_UPDATE);
    const { id } = ParamsSchema.parse(await context.params);
    const input = UpdateClassGroupSchema.parse(await request.json());
    const classes = new ClassGroupRepository();
    if (!(await classes.findById(id))) throw notFound("Turma não encontrada");

    if (input.professorId) {
      const professor = await new UserRepository().findById(input.professorId);
      if (!professor?.roles.some((item) => item.role.name === "PROFESSOR")) {
        throw validationError("Professor informado não possui o perfil PROFESSOR");
      }
    }

    await classes.update(id, {
      ...(input.room !== undefined ? { room: input.room } : {}),
      ...(input.schedule ? { schedule: input.schedule as unknown as Prisma.InputJsonValue } : {}),
      ...(input.professorId !== undefined
        ? {
            professor: input.professorId
              ? { connect: { id: input.professorId } }
              : { disconnect: true },
          }
        : {}),
    });

    await createAuditService().record({
      ...auditActor({ ...actor, ipAddress: getClientIp(request) }),
      action: AUDIT_ACTIONS.ACADEMIC_RECORD_UPDATED,
      module: "CLASSES",
      recordType: "ClassGroup",
      recordId: id,
      result: "SUCCESS",
      newValue: input,
    });

    return Response.json({ status: "UPDATED" });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requirePermission(PERMISSIONS.CLASSES_DELETE);
    const { id } = ParamsSchema.parse(await context.params);
    const classes = new ClassGroupRepository();
    if (!(await classes.findById(id))) throw notFound("Turma não encontrada");

    const enrollments = await db.enrollment.count({ where: { classGroupId: id } });
    if (enrollments > 0) {
      throw conflict("Não é possível excluir uma turma com matrículas vinculadas");
    }

    await db.classGroup.delete({ where: { id } });
    await createAuditService().record({
      ...auditActor({ ...actor, ipAddress: getClientIp(request) }),
      action: AUDIT_ACTIONS.ACADEMIC_RECORD_DELETED,
      module: "CLASSES",
      recordType: "ClassGroup",
      recordId: id,
      result: "SUCCESS",
    });

    return Response.json({ status: "DELETED" });
  } catch (error) {
    return jsonError(error);
  }
}
