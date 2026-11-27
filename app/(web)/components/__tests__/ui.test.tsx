// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlertBanner } from "@/components/AlertBanner";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Confirm } from "@/components/Confirm";
import { DataTable } from "@/components/DataTable";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";

afterEach(cleanup);

describe("Button", () => {
  it("renderiza o texto do botão", () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByRole("button", { name: "Clique aqui" })).toBeDefined();
  });

  it("é um botão nativo", () => {
    render(<Button>Enviar</Button>);
    const button = screen.getByRole("button", { name: "Enviar" });
    expect(button.tagName).toBe("BUTTON");
    expect(button.className).toContain("btnBase");
  });

  it("aplica variant secondary", () => {
    render(
      <Button size="sm" variant="secondary">
        Recusar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Recusar" });
    expect(button.className).toContain("btnSecondary");
    expect(button.className).toContain("btnSm");
  });

  it("renderiza o ícone informado por iconName", () => {
    render(
      <Button iconName="view" iconSize="sm">
        Mostrar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Mostrar" });
    expect(button.querySelector("svg")).toBeDefined();
  });

  it("mostra loading e desabilita", () => {
    render(<Button isLoading>Salvar</Button>);
    const button = screen.getByRole("button", { name: "Aguarde…" });
    expect(button.getAttribute("disabled")).toBeDefined();
  });
});

describe("Field", () => {
  it("associa o rótulo ao input", () => {
    render(<Field label="Senha" name="password" type="password" />);
    const input = screen.getByLabelText("Senha");
    expect(input.getAttribute("type")).toBe("password");
  });

  it("renderiza o botão de ação à direita do campo", () => {
    const onClick = vi.fn();
    render(
      <Field
        action={{ iconName: "view", label: "Mostrar senha", onClick }}
        label="Senha"
        type="password"
      />,
    );
    expect(screen.getByRole("button", { name: "Mostrar senha" })).toBeDefined();
  });
});

describe("Icon", () => {
  it("renderiza o ícone semântico como decorativo", () => {
    const { container } = render(<Icon name="academic" />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("usa um ícone de fallback para nomes desconhecidos", () => {
    const { container } = render(<Icon name="inexistente" />);
    expect(container.querySelector("svg")).toBeDefined();
  });
});

describe("Confirm", () => {
  it("não renderiza quando fechado", () => {
    const { container } = render(
      <Confirm open={false} title="Excluir" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(container.firstElementChild).toBeNull();
  });

  it("renderiza título, descrição e ações quando aberto", () => {
    render(
      <Confirm
        open
        title="Excluir usuário"
        description="Esta ação não pode ser desfeita."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole("alertdialog")).toBeDefined();
    expect(screen.getByText("Excluir usuário")).toBeDefined();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDefined();
  });
});

describe("Badge", () => {
  it("renderiza o texto", () => {
    render(<Badge>Ativo</Badge>);
    expect(screen.getByText("Ativo")).toBeDefined();
  });

  it("aplica variant success", () => {
    render(<Badge variant="success">Aprovado</Badge>);
    expect(screen.getByText("Aprovado").className).toContain("badgeSuccess");
  });

  it("aplica variant danger", () => {
    render(<Badge variant="danger">Bloqueado</Badge>);
    expect(screen.getByText("Bloqueado").className).toContain("badgeDanger");
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
    expect(container.firstElementChild?.className).toContain("panelBase");
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
    expect(container.firstElementChild?.className).toContain("toneWarning");
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

  it("exibe '-' para valores ausentes", () => {
    render(
      <DataTable
        columns={[{ key: "grade", header: "Nota" }]}
        rows={[{ grade: null }]}
        rowKey={() => "1"}
      />,
    );
    expect(screen.getByText("-")).toBeDefined();
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
