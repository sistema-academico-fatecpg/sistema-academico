// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { enable, verifyTotp, push, refresh } = vi.hoisted(() => ({
  enable: vi.fn(),
  verifyTotp: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}));

vi.mock("@/web/lib/auth/client", () => ({
  authClient: {
    twoFactor: {
      enable: (...args: unknown[]) => enable(...args),
      verifyTotp: (...args: unknown[]) => verifyTotp(...args),
    },
  },
}));

import { SetupForm } from "../../(mfa)/configurar-2fa/SetupForm";

const BACKUP_CODES = Array.from({ length: 10 }, (_, index) => `CODE-${index}`);
const NEW_URI = "otpauth://totp/Sistema:new?secret=NEWSECRET&digits=6&period=30";
const OTHER_URI = "otpauth://totp/Sistema:other?secret=OTHERSECRET&digits=6&period=30";

async function confirmSetup() {
  verifyTotp.mockResolvedValue({ data: { token: "token-de-teste" } });
  render(<SetupForm />);
  await screen.findByTestId("qr");
  fireEvent.change(screen.getByLabelText("Código de 6 dígitos do aplicativo"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar código" }));
  expect(await screen.findByText("Segundo fator ativado")).toBeDefined();
}

beforeEach(() => {
  enable.mockReset();
  enable.mockResolvedValue({
    data: { method: "totp", totpURI: NEW_URI, backupCodes: BACKUP_CODES },
  });
  verifyTotp.mockReset();
  push.mockReset();
  refresh.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/api/auth/mfa/codes")) {
        return Promise.resolve({ ok: true, json: async () => ({ status: "CONFIGURED" }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }),
  );
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
  Object.defineProperty(URL, "createObjectURL", {
    value: vi.fn().mockReturnValue("blob:codigos"),
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: vi.fn(),
    configurable: true,
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SetupForm", () => {
  it("gera a chave ao abrir sem pedir a senha novamente", async () => {
    render(<SetupForm />);
    await screen.findByTestId("qr");

    expect(enable).toHaveBeenCalledWith({});
    expect(screen.queryByLabelText("Senha atual")).toBeNull();
    expect(screen.getByTestId("qr").getAttribute("data-value")).toBe(NEW_URI);
  });

  it("permite gerar outra chave sem formulário de senha", async () => {
    render(<SetupForm />);
    await screen.findByTestId("qr");

    enable.mockResolvedValue({
      data: { method: "totp", totpURI: OTHER_URI, backupCodes: BACKUP_CODES },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gerar nova chave" }));

    await waitFor(() =>
      expect(screen.getByTestId("qr").getAttribute("data-value")).toBe(OTHER_URI),
    );
    expect(verifyTotp).not.toHaveBeenCalled();
  });

  it("copia os códigos de recuperação e volta ao início", async () => {
    await confirmSetup();
    expect(screen.getAllByText(/^CODE-/)).toHaveLength(10);

    fireEvent.click(screen.getByRole("button", { name: "Copiar códigos" }));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(BACKUP_CODES.join("\n")),
    );
    expect(push).toHaveBeenCalledWith("/dashboard");
    expect(refresh).toHaveBeenCalled();
  });

  it("baixa os códigos de recuperação", async () => {
    await confirmSetup();

    fireEvent.click(screen.getByRole("button", { name: "Baixar arquivo .txt" }));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/dashboard");
  });
});
