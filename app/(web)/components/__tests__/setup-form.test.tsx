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
const OLD_URI = "otpauth://totp/Sistema:old?secret=OLDSECRET&digits=6&period=30";
const NEW_URI = "otpauth://totp/Sistema:new?secret=NEWSECRET&digits=6&period=30";

function seedPendingSetup() {
  window.sessionStorage.setItem(
    "sistema-academico:totp-setup",
    JSON.stringify({ totpURI: OLD_URI, backupCodes: BACKUP_CODES }),
  );
}

async function confirmSetup() {
  verifyTotp.mockResolvedValue({ data: { token: "token-de-teste" } });
  render(<SetupForm />);
  await screen.findByTestId("qr");
  fireEvent.change(screen.getByLabelText("Código de 6 dígitos do aplicativo"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar código" }));
  return screen.findByText("Segundo fator ativado");
}

beforeEach(() => {
  window.sessionStorage.clear();
  seedPendingSetup();
  enable.mockReset();
  verifyTotp.mockReset();
  push.mockReset();
  refresh.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "CONFIGURED" }) }),
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
  it("mantém a regeneração da chave em um formulário separado da confirmação", async () => {
    enable.mockResolvedValue({
      data: { method: "totp", totpURI: NEW_URI, backupCodes: BACKUP_CODES },
    });
    render(<SetupForm />);

    await screen.findByTestId("qr");
    const forms = Array.from(document.querySelectorAll("form"));
    const regenerateButton = screen.getByRole("button", { name: "Gerar nova chave" });
    expect(forms).toHaveLength(2);
    expect(forms[0].contains(regenerateButton)).toBe(false);
    expect(forms[1].contains(regenerateButton)).toBe(true);

    fireEvent.change(screen.getByLabelText("Senha atual"), {
      target: { value: "Senha@123456" },
    });
    fireEvent.click(regenerateButton);

    await waitFor(() => expect(enable).toHaveBeenCalledWith({ password: "Senha@123456" }));
    await waitFor(() => expect(screen.getByTestId("qr").getAttribute("data-value")).toBe(NEW_URI));
    expect(verifyTotp).not.toHaveBeenCalled();
  });

  it("mostra erro de senha incorreta no formulário de regeneração", async () => {
    enable.mockResolvedValue({
      error: { code: "INVALID_PASSWORD", message: "Invalid password" },
    });
    render(<SetupForm />);

    await screen.findByTestId("qr");
    fireEvent.change(screen.getByLabelText("Senha atual"), {
      target: { value: "senha-errada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gerar nova chave" }));

    expect(await screen.findByText("Senha incorreta.")).toBeDefined();
    expect(screen.getByTestId("qr").getAttribute("data-value")).toBe(OLD_URI);
  });

  it("copia os códigos de recuperação e volta ao início", async () => {
    await confirmSetup();
    expect(screen.getAllByText(/^CODE-/)).toHaveLength(10);

    fireEvent.click(screen.getByRole("button", { name: "Copiar códigos" }));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(BACKUP_CODES.join("\n")),
    );
    expect(push).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalled();
    expect(window.sessionStorage.getItem("sistema-academico:totp-setup")).toBeNull();
  });

  it("baixa os códigos de recuperação e volta ao início", async () => {
    await confirmSetup();

    fireEvent.click(screen.getByRole("button", { name: "Baixar arquivo .txt" }));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
  });
});
