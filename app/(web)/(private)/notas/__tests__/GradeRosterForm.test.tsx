// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfessorRosterItem } from "@/app/lib/academic/grade-service";

const { refresh, fetchMock } = vi.hoisted(() => ({ refresh: vi.fn(), fetchMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { GradeRosterForm } from "../GradeRosterForm";

const roster: ProfessorRosterItem[] = [
  {
    enrollmentId: "11111111-1111-4111-8111-111111111111",
    studentName: "Ana",
    registrationNumber: "1",
    subjectCode: "MAT",
    subjectName: "Matemática",
    grade: 8,
    status: "PUBLISHED",
  },
  {
    enrollmentId: "22222222-2222-4222-8222-222222222222",
    studentName: "Bruno",
    registrationNumber: "2",
    subjectCode: "MAT",
    subjectName: "Matemática",
    grade: null,
    status: "DRAFT",
  },
];

beforeEach(() => {
  refresh.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: "GRADE_SET" }) });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GradeRosterForm", () => {
  it("envia somente linhas preenchidas e alteradas, com um único refresh", async () => {
    render(<GradeRosterForm roster={roster} />);
    const save = screen.getByRole("button", { name: "Salvar notas" });
    expect(save).toHaveProperty("disabled", true);

    // Voltar ao valor original não conta como alteração.
    fireEvent.change(screen.getByLabelText("Nota de Ana"), { target: { value: "8" } });
    expect(save).toHaveProperty("disabled", true);

    fireEvent.change(screen.getByLabelText("Nota de Ana"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Nota de Bruno"), { target: { value: "7.5" } });
    expect(save).toHaveProperty("disabled", false);

    fireEvent.click(save);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledWith("/api/grades", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enrollmentId: roster[0].enrollmentId, value: 9 }),
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/grades", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enrollmentId: roster[1].enrollmentId, value: 7.5 }),
    });
    expect(await screen.findByText("2 notas registradas.")).toBeDefined();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("não envia campo esvaziado (Number('') não vira 0)", async () => {
    render(<GradeRosterForm roster={roster} />);
    fireEvent.change(screen.getByLabelText("Nota de Ana"), { target: { value: "" } });

    const save = screen.getByRole("button", { name: "Salvar notas" });
    expect(save).toHaveProperty("disabled", true);
    fireEvent.click(save);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("consolida erros parciais e segue com as demais linhas", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Período de lançamento fechado" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<GradeRosterForm roster={roster} />);
    fireEvent.change(screen.getByLabelText("Nota de Ana"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Nota de Bruno"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar notas" }));

    expect(await screen.findByText("Ana: Período de lançamento fechado")).toBeDefined();
    expect(screen.getByText("1 nota registrada.")).toBeDefined();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
