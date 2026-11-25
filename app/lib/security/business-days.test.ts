import { describe, expect, it } from "vitest";
import { addBusinessDays, isOverdue } from "./business-days";

describe("prazos em dias úteis (8.8 e 13)", () => {
  it("conta 3 dias úteis a partir de uma quarta-feira", () => {
    // 2026-11-25 é quarta; +3 úteis => segunda 30/11.
    const start = new Date("2026-11-25T10:00:00Z");
    expect(addBusinessDays(start, 3).toISOString().slice(0, 10)).toBe("2026-11-30");
  });

  it("conta 5 dias úteis atravessando fim de semana", () => {
    const start = new Date("2026-11-25T10:00:00Z");
    expect(addBusinessDays(start, 5).toISOString().slice(0, 10)).toBe("2026-12-02");
  });

  it("detecta atraso", () => {
    const deadline = new Date("2026-11-25T10:00:00Z");
    expect(isOverdue(deadline, new Date("2026-11-25T09:00:00Z"))).toBe(false);
    expect(isOverdue(deadline, new Date("2026-11-25T11:00:00Z"))).toBe(true);
    expect(isOverdue(null)).toBe(false);
  });
});
