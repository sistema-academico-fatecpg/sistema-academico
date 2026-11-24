// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

describe("Button component", () => {
  it("deve renderizar o texto do botão", () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByRole("button", { name: "Clique aqui" })).toBeDefined();
  });

  it("deve aplicar variant correta", () => {
    render(<Button variant="destructive">Excluir</Button>);
    const button = screen.getByRole("button", { name: "Excluir" });
    expect(button.className).toContain("bg-destructive");
  });

  it("deve aplicar tamanho correto", () => {
    render(<Button size="sm">Pequeno</Button>);
    const button = screen.getByRole("button", { name: "Pequeno" });
    expect(button.className).toContain("h-9");
  });

  it("deve mostrar loading state", () => {
    render(<Button isLoading>Carregando</Button>);
    const button = screen.getByRole("button", { name: "Carregando" });
    expect(button.getAttribute("disabled")).toBeDefined();
  });
});

describe("Badge component", () => {
  it("deve renderizar o texto do badge", () => {
    render(<Badge>Ativo</Badge>);
    expect(screen.getByText("Ativo")).toBeDefined();
  });

  it("deve aplicar variant correta", () => {
    render(<Badge variant="destructive">Bloqueado</Badge>);
    const badge = screen.getByText("Bloqueado");
    expect(badge.className).toContain("bg-destructive");
  });

  it("deve aplicar variant secondary", () => {
    render(<Badge variant="secondary">Inativo</Badge>);
    const badge = screen.getByText("Inativo");
    expect(badge.className).toContain("bg-secondary");
  });
});
