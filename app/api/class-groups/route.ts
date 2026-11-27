import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma/client";
import { jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { conflict, notFound, validationError } from "@/app/lib/auth/errors";
import { requirePermission } from "@/app/lib/auth/session";
import { getClientIp } from "@/app/lib/request-context";
import { ClassGroupRepository } from "@/app/repositories/class-group.repository";
import { AcademicPeriodRepository } from "@/app/repositories/period.repository";
import { SubjectRepository } from "@/app/repositories/subject.repository";
import { UserRepository } from "@/app/repositories/user.repository";
import { CreateClassGroupSchema } from "@/app/types/academic";
import { PERMISSIONS } from "@/app/types/roles";

const QuerySchema = z.object({
  academicPeriodId: z.string().uuid().optional(),
  professorId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  try {
    // A listagem completa é administrativa: alunos/professores já têm listas
    // escopadas em EnrollmentService/ClassGroupRepository.listForProfessor.
    await requirePermission(PERMISSIONS.USERS_CREATE);
    const filter = QuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const groups = await new ClassGroupRepository().list(filter);
    return Response.json({
      items: groups.map((group) => ({
        id: group.id,
        subjectId: group.subjectId,
        subjectCode: group.subject.code,
        subjectName: group.subject.name,
        periodNumber: group.subject.periodNumber,
        academicPeriodId: group.academicPeriodId,
        academicPeriodName: group.academicPeriod.name,
        professorId: group.professorId,
        professorName: group.professor?.name ?? null,
        room: group.room,
        schedule: group.schedule,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.CLASSES_CREATE);
    const input = CreateClassGroupSchema.parse(await request.json());
    const classes = new ClassGroupRepository();

    if (!(await new SubjectRepository().findById(input.subjectId))) {
      throw notFound("Disciplina não encontrada");
    }
    if (!(await new AcademicPeriodRepository().findById(input.academicPeriodId))) {
      throw notFound("Período letivo não encontrado");
    }
    if (input.professorId) {
      const professor = await new UserRepository().findById(input.professorId);
      if (!professor?.roles.some((item) => item.role.name === "PROFESSOR")) {
        throw validationError("Professor informado não possui o perfil PROFESSOR");
      }
      if (professor.status !== "ACTIVE") {
        throw validationError("Professor informado não está ativo");
      }
      const duplicate = await classes.findDuplicate({
        subjectId: input.subjectId,
        academicPeriodId: input.academicPeriodId,
        professorId: input.professorId,
      });
      if (duplicate) throw conflict("Já existe turma desta disciplina para o professor no período");
    }

    const group = await classes.create({
      subject: { connect: { id: input.subjectId } },
      academicPeriod: { connect: { id: input.academicPeriodId } },
      ...(input.professorId ? { professor: { connect: { id: input.professorId } } } : {}),
      ...(input.room ? { room: input.room } : {}),
      schedule: input.schedule as unknown as Prisma.InputJsonValue,
    });

    await createAuditService().record({
      ...auditActor({ ...actor, ipAddress: getClientIp(request) }),
      action: AUDIT_ACTIONS.ACADEMIC_RECORD_CREATED,
      module: "CLASSES",
      recordType: "ClassGroup",
      recordId: group.id,
      result: "SUCCESS",
      newValue: { subjectId: group.subjectId, academicPeriodId: group.academicPeriodId },
    });

    return Response.json({ id: group.id, ...input }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
