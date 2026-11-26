// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";

afterEach(cleanup);

describe("Button", () => {
  it("renderiza o texto do botão", () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByRole("button", { name: "Clique aqui" })).toBeDefined();
  });

  it("aplica a cor institucional por padrão", () => {
    render(<Button>Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" }).className).toContain("bg-[#6b1720]");
  });

  it("aplica variant outline e size sm", () => {
    render(
      <Button size="sm" variant="outline">
        Recusar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Recusar" });
    expect(button.className).toContain("border-rose-300");
    expect(button.className).toContain("text-xs");
  });

  it("mostra loading e desabilita", () => {
    render(<Button isLoading>Salvar</Button>);
    const button = screen.getByRole("button", { name: "Aguarde..." });
    expect(button.getAttribute("disabled")).toBeDefined();
  });
});

describe("Badge", () => {
  it("renderiza o texto", () => {
    render(<Badge>Ativo</Badge>);
    expect(screen.getByText("Ativo")).toBeDefined();
  });

  it("aplica variant success", () => {
    render(<Badge variant="success">Aprovado</Badge>);
    expect(screen.getByText("Aprovado").className).toContain("bg-emerald-50");
  });

  it("aplica variant danger", () => {
    render(<Badge variant="danger">Bloqueado</Badge>);
    expect(screen.getByText("Bloqueado").className).toContain("bg-rose-50");
  });
});

describe("PageHeader", () => {
  it("renderiza eyebrow, título e descrição", () => {
    render(<PageHeader title="Auditoria" description="Registros imutáveis" />);
    expect(screen.getByRole("heading", { level: 1, name: "Auditoria" })).toBeDefined();
    expect(screen.getByText("Registros imutáveis")).toBeDefined();
    expect(screen.getByText("Módulo institucional")).toBeDefined();
  });

  it("aceita eyebrow customizado e ação", () => {
    render(
      <PageHeader eyebrow="Administração" title="Usuários" action={<a href="/novo">Novo</a>} />,
    );
    expect(screen.getByText("Administração")).toBeDefined();
    expect(screen.getByRole("link", { name: "Novo" })).toBeDefined();
  });
});

describe("Panel", () => {
  it("renderiza como div por padrão", () => {
    const { container } = render(<Panel>Conteúdo</Panel>);
    expect(container.firstElementChild?.tagName).toBe("DIV");
    expect(container.firstElementChild?.className).toContain("rounded-2xl");
  });

  it("renderiza como form com method", () => {
    const { container } = render(
      <Panel as="form" method="get">
        Campos
      </Panel>,
    );
    expect(container.firstElementChild?.tagName).toBe("FORM");
    expect(container.firstElementChild?.getAttribute("method")).toBe("get");
  });
});

describe("AlertBanner", () => {
  it("aplica tom de aviso", () => {
    const { container } = render(<AlertBanner tone="warning" title="Atenção" />);
    expect(container.firstElementChild?.className).toContain("bg-amber-50");
    expect(screen.getByText("Atenção")).toBeDefined();
  });
});

describe("DataTable", () => {
  const rows = [
    { id: "1", name: "Ana", status: "ACTIVE" },
    { id: "2", name: "Bruno", status: "BLOCKED" },
  ];

  it("renderiza cabeçalho e linhas", () => {
    render(
      <DataTable
        columns={[
          { key: "name", header: "Nome" },
          { key: "status", header: "Status" },
        ]}
        rows={rows}
        rowKey={(row) => row.id}
      />,
    );
    expect(screen.getByText("Nome")).toBeDefined();
    expect(screen.getByText("Ana")).toBeDefined();
    expect(screen.getByText("BLOCKED")).toBeDefined();
  });

  it("usa render customizado", () => {
    render(
      <DataTable
        columns={[{ key: "name", header: "Nome", render: (row) => <strong>{row.name}</strong> }]}
        rows={rows}
        rowKey={(row) => row.id}
      />,
    );
    expect(screen.getByText("Ana").tagName).toBe("STRONG");
  });

  it("mostra mensagem de vazio com colSpan", () => {
    const { container } = render(
      <DataTable
        columns={[
          { key: "name", header: "Nome" },
          { key: "status", header: "Status" },
        ]}
        rows={[]}
        rowKey={() => "empty"}
        emptyMessage="Nada aqui"
      />,
    );
    const cell = screen.getByText("Nada aqui");
    expect(cell.getAttribute("colspan")).toBe("2");
    expect(container).toBeDefined();
  });
});

describe("ModulePlaceholder", () => {
  it("renderiza título, endpoint e badge", () => {
    render(
      <ModulePlaceholder
        title="Cursos"
        description="Estrutura dos cursos"
        endpoint="/api/courses"
        roles="ADMIN_MASTER"
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Cursos" })).toBeDefined();
    expect(screen.getByText("/api/courses")).toBeDefined();
    expect(screen.getByText("Integração de interface")).toBeDefined();
  });
});
