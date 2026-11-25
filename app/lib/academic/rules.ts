import { type ScheduleSlot, ScheduleSlotSchema } from "@/app/types/academic";

export type GradeWindowLike = {
  gradesOpenAt: Date | null;
  gradesCloseAt: Date | null;
};

export type EnrollmentWindowLike = {
  enrollmentOpensAt: Date;
  enrollmentClosesAt: Date;
};

function minutes(value: string): number {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

export function parseSchedule(value: unknown): ScheduleSlot[] {
  if (!Array.isArray(value)) return [];
  const slots: ScheduleSlot[] = [];
  for (const item of value) {
    const parsed = ScheduleSlotSchema.safeParse(item);
    if (parsed.success) slots.push(parsed.data);
  }
  return slots;
}

export function slotsOverlap(a: ScheduleSlot, b: ScheduleSlot): boolean {
  if (a.weekday !== b.weekday) return false;
  return minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);
}

export function schedulesConflict(left: unknown, right: unknown): boolean {
  const a = parseSchedule(left);
  const b = parseSchedule(right);
  return a.some((slotA) => b.some((slotB) => slotsOverlap(slotA, slotB)));
}

/**
 * A janela é sempre decidida pelo horário do servidor (9.2.2). O cliente não
 * envia a data/hora considerada.
 */
export function gradesWindowOpen(period: GradeWindowLike, now = new Date()): boolean {
  if (!period.gradesOpenAt || !period.gradesCloseAt) return false;
  return now >= period.gradesOpenAt && now <= period.gradesCloseAt;
}

export function enrollmentWindowOpen(period: EnrollmentWindowLike, now = new Date()): boolean {
  return now >= period.enrollmentOpensAt && now <= period.enrollmentClosesAt;
}

export type EnrollmentCandidate = {
  id: string;
  subjectId: string;
  schedule: unknown;
  isDependency: boolean;
};

/**
 * Regras 9.1.2 e 9.1.3: havendo DP pendente, a turma de DP deve estar entre as
 * selecionadas e nenhuma outra turma pode conflitar com ela.
 */
export function validateEnrollmentSelection(
  selected: readonly string[],
  candidates: readonly EnrollmentCandidate[],
): { valid: boolean; reason?: string } {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const chosen = selected.map((id) => byId.get(id));
  if (chosen.some((item) => !item)) {
    return { valid: false, reason: "Turma inválida ou fora do período do aluno" };
  }

  const dependencyGroups = candidates.filter((candidate) => candidate.isDependency);
  if (dependencyGroups.length === 0) return { valid: true };

  const selectedDependencies = dependencyGroups.filter((candidate) =>
    selected.includes(candidate.id),
  );
  if (selectedDependencies.length === 0) {
    return { valid: false, reason: "A disciplina em DP deve ser escolhida primeiro" };
  }
  // 9.1.2: "antes das demais" — a primeira turma confirmada deve ser a DP.
  const first = byId.get(selected[0]);
  if (!first?.isDependency) {
    return { valid: false, reason: "A disciplina em DP deve ser a primeira escolha" };
  }

  for (const dependency of selectedDependencies) {
    const conflicting = chosen.find(
      (item) =>
        item &&
        item.id !== dependency.id &&
        !item.isDependency &&
        schedulesConflict(dependency.schedule, item.schedule),
    );
    if (conflicting) {
      return {
        valid: false,
        reason: `Conflito de horário com a DP (turma ${conflicting.id})`,
      };
    }
  }

  return { valid: true };
}
