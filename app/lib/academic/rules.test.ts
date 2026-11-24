import { describe, expect, it } from "vitest";
import {
  type EnrollmentCandidate,
  enrollmentWindowOpen,
  gradesWindowOpen,
  schedulesConflict,
  validateEnrollmentSelection,
} from "./rules";

const schedules = {
  mondayMorning: [{ weekday: 1, start: "08:00", end: "10:00" }],
  mondayOverlap: [{ weekday: 1, start: "09:00", end: "11:00" }],
  mondayAfternoon: [{ weekday: 1, start: "14:00", end: "16:00" }],
  tuesdayMorning: [{ weekday: 2, start: "08:00", end: "10:00" }],
};

const candidates: EnrollmentCandidate[] = [
  { id: "dp", subjectId: "sub-dp", schedule: schedules.mondayMorning, isDependency: true },
  {
    id: "regular-ok",
    subjectId: "sub-1",
    schedule: schedules.mondayAfternoon,
    isDependency: false,
  },
  {
    id: "regular-conflict",
    subjectId: "sub-2",
    schedule: schedules.mondayOverlap,
    isDependency: false,
  },
  {
    id: "regular-tuesday",
    subjectId: "sub-3",
    schedule: schedules.tuesdayMorning,
    isDependency: false,
  },
];

describe("regras acadêmicas no servidor (seção 9)", () => {
  it("abre e fecha matrícula e notas pelo horário do servidor", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const period = {
      enrollmentOpensAt: new Date("2026-06-01T00:00:00Z"),
      enrollmentClosesAt: new Date("2026-06-30T00:00:00Z"),
      gradesOpenAt: new Date("2026-06-10T00:00:00Z"),
      gradesCloseAt: new Date("2026-06-20T00:00:00Z"),
    };
    expect(enrollmentWindowOpen(period, now)).toBe(true);
    expect(gradesWindowOpen(period, now)).toBe(false);
    expect(gradesWindowOpen(period, new Date("2026-06-15T12:00:00Z"))).toBe(true);
    expect(gradesWindowOpen(period, new Date("2026-06-21T12:00:00Z"))).toBe(false);
  });

  it("detecta conflito apenas no mesmo dia e horário", () => {
    expect(schedulesConflict(schedules.mondayMorning, schedules.mondayOverlap)).toBe(true);
    expect(schedulesConflict(schedules.mondayMorning, schedules.mondayAfternoon)).toBe(false);
    expect(schedulesConflict(schedules.mondayMorning, schedules.tuesdayMorning)).toBe(false);
  });

  it("exige a DP antes das demais disciplinas", () => {
    expect(validateEnrollmentSelection(["regular-ok"], candidates)).toEqual({
      valid: false,
      reason: "A disciplina em DP deve ser escolhida primeiro",
    });
    expect(validateEnrollmentSelection(["dp", "regular-ok"], candidates).valid).toBe(true);
  });

  it("bloqueia turmas com conflito de horário com a DP", () => {
    const result = validateEnrollmentSelection(["dp", "regular-conflict"], candidates);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Conflito de horário com a DP/);
  });

  it("permite qualquer turma do período quando não há DP", () => {
    const withoutDp: EnrollmentCandidate[] = candidates.slice(1).map((item) => ({
      ...item,
      isDependency: false,
    }));
    expect(validateEnrollmentSelection(["regular-conflict"], withoutDp).valid).toBe(true);
  });

  it("recusa turma fora da lista do aluno", () => {
    expect(validateEnrollmentSelection(["inexistente"], candidates).valid).toBe(false);
  });
});
