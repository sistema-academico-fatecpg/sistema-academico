// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { enable, verifyTotp } = vi.hoisted(() => ({
  enable: vi.fn(),
  verifyTotp: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}));

vi.mock("@/app/lib/auth/client", () => ({
  authClient: {
    twoFactor: {
      enable: (...args: unknown[]) => enable(...args),
      verifyTotp: (...args: unknown[]) => verifyTotp(...args),
    },
  },
}));

import { SetupForm } from "../../(auth)/configurar-2fa/SetupForm";

const BACKUP_CODES = Array.from({ length: 10 }, (_, index) => `CODE-${index}`);
const OLD_URI = "otpauth://totp/Sistema:old?secret=OLDSECRET&digits=6&period=30";
const NEW_URI = "otpauth://totp/Sistema:new?secret=NEWSECRET&digits=6&period=30";

function seedPendingSetup() {
  window.sessionStorage.setItem(
    "sistema-academico:totp-setup",
    JSON.stringify({ totpURI: OLD_URI, backupCodes: BACKUP_CODES }),
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  seedPendingSetup();
  enable.mockReset();
  verifyTotp.mockReset();
});

afterEach(cleanup);

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
    expect(await screen.findByText(/Nova chave gerada/)).toBeDefined();
    expect(screen.getByTestId("qr").getAttribute("data-value")).toBe(NEW_URI);
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
});
