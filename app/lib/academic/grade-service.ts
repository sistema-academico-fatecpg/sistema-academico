import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { forbidden, notFound, validationError } from "@/app/lib/auth/errors";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { ClassGroupRepository } from "@/app/repositories/class-group.repository";
import { EnrollmentRepository } from "@/app/repositories/enrollment.repository";
import { GradeRepository } from "@/app/repositories/grade.repository";
import type { AcademicActor } from "./enrollment-service";
import { gradesWindowOpen } from "./rules";

export type ProfessorRosterItem = {
  enrollmentId: string;
  studentName: string;
  registrationNumber: string | null;
  subjectCode: string;
  subjectName: string;
  grade: number | null;
  status: "DRAFT" | "PUBLISHED";
};

export class GradeService {
  constructor(
    private readonly classes = new ClassGroupRepository(),
    private readonly enrollments = new EnrollmentRepository(),
    private readonly grades = new GradeRepository(),
    private readonly criticalOperations = new CriticalOperationService(),
    private readonly audit = createAuditService(),
  ) {}

  private assertProfessor(actor: AcademicActor): void {
    if (!actor.roles.includes("PROFESSOR")) {
      throw forbidden("Somente professores podem lançar notas");
    }
  }

  /** 9.2.3: somente turmas vinculadas e dados mínimos dos alunos. */
  async roster(actor: AcademicActor, classGroupId: string): Promise<ProfessorRosterItem[]> {
    this.assertProfessor(actor);
    const group = await this.classes.findById(classGroupId);
    if (!group) throw notFound("Turma não encontrada");
    if (group.professorId !== actor.id) {
      throw forbidden("Professor não vinculado a esta turma");
    }

    const enrollments = await this.enrollments.listForClassGroup(classGroupId);
    return enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      studentName: enrollment.student.socialName || enrollment.student.name,
      registrationNumber: enrollment.student.registrationNumber,
      subjectCode: group.subject.code,
      subjectName: group.subject.name,
      grade: enrollment.grade?.value ? Number(enrollment.grade.value) : null,
      status: enrollment.grade?.status ?? "DRAFT",
    }));
  }

  /** 9.2.1–9.2.4: janela no servidor, vínculo com a turma e histórico. */
  async setGrade(
    actor: AcademicActor,
    input: { enrollmentId: string; value: number },
  ): Promise<void> {
    this.assertProfessor(actor);
    const enrollment = await this.enrollments.findByIdWithClass(input.enrollmentId);
    if (!enrollment) throw notFound("Matrícula não encontrada");
    if (enrollment.status !== "ACTIVE") throw validationError("Matrícula não está ativa");
    const group = enrollment.classGroup;

    if (group.professorId !== actor.id) {
      throw forbidden("Professor não vinculado a esta turma");
    }
    if (!gradesWindowOpen(group.academicPeriod, new Date())) {
      await this.audit.record({
        userId: actor.id as never,
        role: "PROFESSOR",
        ipAddress: actor.ipAddress,
        action: AUDIT_ACTIONS.GRADE_CHANGE_OUTSIDE_PERIOD,
        module: "GRADES",
        recordType: "Grade",
        recordId: input.enrollmentId,
        result: "FAILURE",
        newValue: { value: input.value },
      });
      throw validationError(
        "Período de lançamento fechado; use solicitação de correção com dupla aprovação",
      );
    }

    await this.grades.setGrade({
      enrollmentId: input.enrollmentId,
      professorId: actor.id,
      value: input.value,
    });
    await this.audit.record({
      userId: actor.id as never,
      role: "PROFESSOR",
      ipAddress: actor.ipAddress,
      action: AUDIT_ACTIONS.GRADE_CHANGED,
      module: "GRADES",
      recordType: "Grade",
      recordId: input.enrollmentId,
      result: "SUCCESS",
      newValue: { value: input.value },
    });
  }

  /** 9.2.5: correção pós-fechamento nunca é direta. */
  async requestCorrection(
    actor: AcademicActor,
    input: { enrollmentId: string; value: number; reason: string },
  ): Promise<{ requestId: string }> {
    const isAdmin = actor.roles.some(
      (role) => role === "ADMIN_MASTER" || role === "ADMIN_SECUNDARIO",
    );
    if (!isAdmin) {
      this.assertProfessor(actor);
      const enrollment = await this.enrollments.findByIdWithClass(input.enrollmentId);
      if (!enrollment) throw notFound("Matrícula não encontrada");
      if (enrollment.status !== "ACTIVE") throw validationError("Matrícula não está ativa");
      if (enrollment.classGroup.professorId !== actor.id) {
        throw forbidden("Professor não vinculado à turma desta matrícula");
      }
    }

    const request = await this.criticalOperations.request(
      {
        id: actor.id,
        roles: actor.roles as never,
        ipAddress: actor.ipAddress,
      },
      {
        operation: "GRADE_CORRECTION_AFTER_CLOSING",
        module: "GRADES",
        recordType: "Grade",
        recordId: input.enrollmentId,
        reason: input.reason,
        payload: {
          enrollmentId: input.enrollmentId,
          value: input.value,
          reason: input.reason,
        },
      },
    );
    return { requestId: request.id };
  }
}
