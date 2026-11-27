import { conflict, notFound, validationError } from "@/app/lib/auth/errors";
import { ClassGroupRepository } from "@/app/repositories/class-group.repository";
import { EnrollmentRepository } from "@/app/repositories/enrollment.repository";
import type { RoleName } from "@/app/types/common";

export type ClassAssignmentInput = {
  userId: string;
  role: string;
  classGroupId: string;
  /** Quem fez o cadastro (usado como createdBy na matrícula do aluno). */
  actorId: string;
};

/**
 * Vincula o usuário recém-cadastrado à turma escolhida.
 *
 * - Professor -> `ClassGroup.professorId`: é esse vínculo que `GradeService`
 *   exige para listar a turma e lançar notas (9.2.3).
 * - Aluno -> `Enrollment` ativo: é esse vínculo que `EnrollmentService.ownHistory`
 *   usa para devolver somente as notas das turmas do aluno (9.3.1).
 */
export async function assignUserToClassGroup(
  input: ClassAssignmentInput,
  classes = new ClassGroupRepository(),
  enrollments = new EnrollmentRepository(),
): Promise<void> {
  const group = await classes.findById(input.classGroupId);
  if (!group) throw notFound("Turma não encontrada");

  if (input.role === "PROFESSOR") {
    if (group.professorId === input.userId) return;
    const assigned = await classes.assignProfessorIfFree(group.id, input.userId);
    if (assigned.count === 0) {
      throw conflict("Esta turma já possui outro professor vinculado");
    }
    return;
  }

  if (input.role === "ALUNO") {
    await enrollments.upsertForStudent({
      studentId: input.userId,
      classGroupId: group.id,
      createdBy: input.actorId,
    });
    return;
  }

  throw validationError("Turma só pode ser vinculada a aluno ou professor");
}

export function classGroupIsRequired(role: string): boolean {
  return (["ALUNO", "PROFESSOR"] as RoleName[]).includes(role as RoleName);
}
