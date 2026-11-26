"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { authClient } from "@/app/lib/auth/client";
import {
  clearPendingTotpSetup,
  readPendingTotpSetup,
  savePendingTotpSetup,
} from "@/app/lib/auth/totp-setup";
import { Button, FormFeedback, Input, Label } from "@/components/ui";

function manualSecret(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? uri;
  } catch {
    return uri;
  }
}

export function SetupForm() {
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<{
    scope: "setup" | "confirm" | "enable";
    message: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"confirm" | "enable" | null>(null);
  const [done, setDone] = useState(false);

  // Quando a configuração começa durante a ativação, a chave já vem preparada
  // e a senha não é solicitada novamente.
  useEffect(() => {
    const pending = readPendingTotpSetup();
    if (pending) {
      setTotpURI(pending.totpURI);
      setBackupCodes(pending.backupCodes);
    }
  }, []);

  function showError(scope: "setup" | "confirm" | "enable", message: string) {
    setError({ scope, message });
  }

  async function enable(event: React.FormEvent, scope: "setup" | "enable" = "enable") {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!password) {
      showError(scope, "Informe sua senha para gerar a chave.");
      return;
    }
    setBusy("enable");
    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error) {
        showError(
          scope,
          result.error.code === "INVALID_PASSWORD" || result.error.message === "Invalid password"
            ? "Senha incorreta."
            : (result.error.message ?? "Não foi possível iniciar a configuração"),
        );
        return;
      }
      if (result.data?.method !== "totp") {
        showError(scope, "Método de segundo fator não suportado");
        return;
      }
      setTotpURI(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
      setCode("");
      setPassword("");
      savePendingTotpSetup({
        totpURI: result.data.totpURI,
        backupCodes: result.data.backupCodes,
      });
      if (scope === "enable") {
        setNotice(
          "Nova chave gerada. Exclua a entrada antiga do autenticador e adicione esta chave antes de confirmar.",
        );
      }
    } catch {
      showError(scope, "Não foi possível gerar a chave. Verifique sua conexão e tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy("confirm");
    try {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        showError(
          "confirm",
          result.error.code === "INVALID_CODE"
            ? "Esse não é o código do aplicativo. Digite apenas os 6 dígitos mostrados no autenticador para esta chave. Se o código estiver correto, confira a data/hora do aparelho."
            : (result.error.message ?? "Código inválido"),
        );
        return;
      }

      const sync = await fetch("/api/auth/mfa/codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ backupCodes }),
      });
      if (!sync.ok) {
        showError(
          "confirm",
          "Não foi possível registrar os códigos de recuperação. Procure a secretaria.",
        );
        return;
      }
      clearPendingTotpSetup();
      setDone(true);
    } catch {
      showError(
        "confirm",
        "Não foi possível confirmar o código. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (done) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Segundo fator ativado</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Guarde os códigos de recuperação em local seguro. Cada código pode ser usado uma vez.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-4 font-mono text-sm">
          {backupCodes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Link className="mt-6 inline-block font-medium underline" href="/">
          Voltar ao início
        </Link>
      </div>
    );
  }

  if (totpURI) {
    return (
      <div className="space-y-6">
        <form className="space-y-4" onSubmit={confirm}>
          <h1 className="text-xl font-semibold">Confirmar autenticador</h1>
          <ol className="list-inside list-decimal space-y-1 text-sm text-zinc-600">
            <li>Adicione a chave abaixo ao aplicativo autenticador (QR code ou chave manual).</li>
            <li>Digite neste formulário somente os 6 dígitos mostrados pelo aplicativo.</li>
          </ol>
          <div className="flex justify-center rounded-lg border border-zinc-200 bg-white p-4">
            <QRCodeSVG value={totpURI} size={208} level="M" includeMargin />
          </div>
          <details className="text-sm text-zinc-600">
            <summary className="cursor-pointer">
              Não consigo ler o QR code: usar a chave manual
            </summary>
            <p className="mt-2">Essa chave vai no aplicativo — não é o código deste formulário.</p>
            <code className="mt-2 block break-all rounded-lg bg-zinc-100 p-3 text-xs">
              {manualSecret(totpURI)}
            </code>
            <code className="mt-2 block break-all rounded-lg bg-zinc-100 p-3 text-xs">
              {totpURI}
            </code>
          </details>
          <p className="text-xs text-zinc-500">
            Digite o código assim que ele aparecer. Se não for aceito, confira a data/hora do
            aparelho.
          </p>
          <FormFeedback message={notice} />
          <Label>
            Código de 6 dígitos do aplicativo
            <Input
              autoComplete="one-time-code"
              className="tracking-widest"
              disabled={busy !== null}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              required
              value={code}
            />
          </Label>
          <FormFeedback error={error?.scope === "confirm" ? error.message : null} />
          <Button className="w-full" disabled={busy !== null} type="submit">
            {busy === "confirm" ? "Confirmando..." : "Confirmar código"}
          </Button>
        </form>

        <details className="border-t border-zinc-200 pt-4 text-sm text-zinc-600">
          <summary className="cursor-pointer">O código continua inválido: gerar nova chave</summary>
          <form className="mt-3 space-y-3" onSubmit={enable}>
            <p>
              A chave pode ter mudado após uma reativação. Informe sua senha, gere outra chave,
              exclua a entrada antiga do autenticador e leia o novo QR code.
            </p>
            <Label>
              Senha atual
              <Input
                disabled={busy !== null}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </Label>
            <FormFeedback error={error?.scope === "enable" ? error.message : null} />
            <Button disabled={busy !== null} type="submit">
              {busy === "enable" ? "Gerando chave..." : "Gerar nova chave"}
            </Button>
          </form>
        </details>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={enable}>
      <h1 className="text-xl font-semibold">Configurar segundo fator</h1>
      <p className="text-sm text-zinc-600">
        Perfis administrativos, professores, auditores e suporte técnico exigem TOTP. Confirme sua
        senha para gerar a chave.
      </p>
      <Label>
        Senha atual
        <Input
          disabled={busy !== null}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </Label>
      <FormFeedback error={error?.scope === "setup" ? error.message : null} />
      <Button className="w-full" disabled={busy !== null} type="submit">
        {busy === "enable" ? "Gerando chave..." : "Gerar chave TOTP"}
      </Button>
    </form>
  );
}
