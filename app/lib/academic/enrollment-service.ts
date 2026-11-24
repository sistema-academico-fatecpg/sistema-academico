import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { conflict, forbidden, validationError } from "@/app/lib/auth/errors";
import { db } from "@/app/lib/db";
import { ClassGroupRepository } from "@/app/repositories/class-group.repository";
import { EnrollmentRepository } from "@/app/repositories/enrollment.repository";
import { AcademicPeriodRepository } from "@/app/repositories/period.repository";
import { UserRepository } from "@/app/repositories/user.repository";
import type { ClassGroupDto, ScheduleSlot, StudentGradeDto } from "@/app/types/academic";
import {
  type EnrollmentCandidate,
  enrollmentWindowOpen,
  parseSchedule,
  schedulesConflict,
  validateEnrollmentSelection,
} from "./rules";

export type AcademicActor = {
  id: string;
  roles: readonly string[];
  ipAddress: string;
};

function assertStudent(actor: AcademicActor): void {
  if (!actor.roles.includes("ALUNO")) {
    throw forbidden("Somente o aluno pode realizar a própria matrícula");
  }
}

function scheduleOf(value: unknown): ScheduleSlot[] {
  return parseSchedule(value);
}

export class EnrollmentService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly periods = new AcademicPeriodRepository(),
    private readonly classes = new ClassGroupRepository(),
    private readonly enrollments = new EnrollmentRepository(),
    private readonly audit = createAuditService(),
  ) {}

  private async studentContext(actor: AcademicActor) {
    assertStudent(actor);
    const user = await this.users.findById(actor.id);
    if (!user?.studentProfile) throw validationError("Perfil de aluno não encontrado");
    const period = await this.periods.findCurrent();
    if (!period) throw validationError("Nenhum período letivo vigente");
    const dependencies = await db.studentDependency.findMany({
      where: { studentId: actor.id, resolvedAt: null },
      select: { subjectId: true },
    });
    return {
      profile: user.studentProfile,
      period,
      dependencySubjectIds: dependencies.map((item) => item.subjectId),
    };
  }

  private async candidates(
    context: Awaited<ReturnType<EnrollmentService["studentContext"]>>,
  ): Promise<EnrollmentCandidate[]> {
    const groups = await this.classes.listForStudent({
      courseId: context.profile.courseId,
      currentPeriod: context.profile.currentPeriod,
      academicPeriodId: context.period.id,
      dependencySubjectIds: context.dependencySubjectIds,
    });
    return groups.map((group) => ({
      id: group.id,
      subjectId: group.subjectId,
      schedule: group.schedule,
      isDependency: context.dependencySubjectIds.includes(group.subjectId),
    }));
  }

  /** 9.1.1–9.1.3: lista restrita ao período do aluno, com DP obrigatória e conflitos. */
  async available(actor: AcademicActor): Promise<ClassGroupDto[]> {
    const context = await this.studentContext(actor);
    const candidates = await this.candidates(context);
    const groups = await this.classes.findByIds(candidates.map((item) => item.id));
    const dependencySchedules = candidates
      .filter((item) => item.isDependency)
      .map((item) => item.schedule);

    return groups.map((group) => {
      const candidate = candidates.find((item) => item.id === group.id);
      const hasConflict = dependencySchedules.some((schedule) =>
        schedulesConflict(schedule, group.schedule),
      );
      return {
        id: group.id,
        subjectId: group.subjectId,
        subjectCode: group.subject.code,
        subjectName: group.subject.name,
        periodNumber: group.subject.periodNumber,
        professorId: group.professorId,
        professorName: null,
        schedule: scheduleOf(group.schedule),
        room: group.room,
        isDependency: candidate?.isDependency ?? false,
        hasConflict: (candidate?.isDependency ?? false) ? false : hasConflict,
      };
    });
  }

  /** Confirma a matrícula. Exceções não passam por aqui (9.1.4). */
  async enroll(
    actor: AcademicActor,
    classGroupIds: readonly string[],
  ): Promise<{ created: number }> {
    const context = await this.studentContext(actor);
    if (!enrollmentWindowOpen(context.period, new Date())) {
      throw conflict("Período de matrícula encerrado; exceções exigem dupla aprovação");
    }

    const candidates = await this.candidates(context);
    const selection = validateEnrollmentSelection(classGroupIds, candidates);
    if (!selection.valid) throw validationError(selection.reason ?? "Seleção inválida");

    for (const id of classGroupIds) {
      const existing = await this.enrollments.findActiveByStudentAndClass(actor.id, id);
      if (existing) throw conflict("Matrícula já existente para uma das turmas");
    }

    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    await this.enrollments.createMany(
      classGroupIds.map((id) => ({
        studentId: actor.id,
        classGroupId: id,
        createdBy: actor.id,
        isDependency: byId.get(id)?.isDependency ?? false,
        status: "ACTIVE",
      })),
    );

    await this.audit.record({
      userId: actor.id as never,
      role: "ALUNO",
      ipAddress: actor.ipAddress,
      action: AUDIT_ACTIONS.ENROLLMENT_CREATED,
      module: "ENROLLMENTS",
      recordType: "Enrollment",
      result: "SUCCESS",
      newValue: {
        classGroupIds: [...classGroupIds],
        dependencyFirst: context.dependencySubjectIds.length > 0,
      },
    });

    return { created: classGroupIds.length };
  }

  /** 9.3.1: identificador do aluno vem exclusivamente da sessão. */
  async ownHistory(actor: AcademicActor): Promise<StudentGradeDto[]> {
    assertStudent(actor);
    const enrollments = await this.enrollments.listForStudent(actor.id);
    return enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      classGroupId: enrollment.classGroupId,
      subjectCode: enrollment.classGroup.subject.code,
      subjectName: enrollment.classGroup.subject.name,
      professorName: null,
      grade: enrollment.grade?.value ? Number(enrollment.grade.value) : null,
      status: enrollment.grade?.status ?? "DRAFT",
      updatedAt: enrollment.grade?.updatedAt.toISOString() ?? null,
    }));
  }
}
