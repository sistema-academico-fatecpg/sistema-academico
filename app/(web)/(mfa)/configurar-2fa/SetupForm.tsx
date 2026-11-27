"use client";

import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import {
  clearPendingTotpSetup,
  readPendingTotpSetup,
  savePendingTotpSetup,
} from "@/app/lib/auth/totp-setup";
import { Button, Field, FormFeedback, PageHeader } from "@/components";
import { authClient } from "@/web/lib/auth/client";
import styles from "./styles.module.scss";

function manualSecret(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? uri;
  } catch {
    return uri;
  }
}

export function SetupForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<{
    scope: "setup" | "confirm" | "done";
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState<"confirm" | "setup" | null>(null);
  const [done, setDone] = useState(false);

  // Quando a configuração começa durante a ativação, a chave já vem preparada
  // e a senha não é solicitada novamente. A chave só é aceita se pertencer ao
  // usuário da sessão atual e tiver sido gerada recentemente — uma chave antiga
  // no sessionStorage geraria TOTP inválido (401).
  useEffect(() => {
    let cancelled = false;
    async function loadPending() {
      const response = await fetch("/api/auth/me").catch(() => null);
      if (!response?.ok || cancelled) return;
      const me = (await response.json()) as { id?: string };
      if (!me.id || cancelled) return;
      setUserId(me.id);
      const pending = readPendingTotpSetup(me.id);
      if (!pending) {
        clearPendingTotpSetup();
        return;
      }
      setTotpURI(pending.totpURI);
      setBackupCodes(pending.backupCodes);
    }
    void loadPending();
    return () => {
      cancelled = true;
    };
  }, []);

  function showError(scope: "setup" | "confirm" | "done", message: string) {
    setError({ scope, message });
  }

  function goHome() {
    router.push("/");
    router.refresh();
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      goHome();
    } catch {
      showError("done", "Não foi possível copiar. Use o botão Baixar ou anote os códigos abaixo.");
    }
  }

  function downloadCodes() {
    const content = [
      "Sistema Acadêmico — códigos de recuperação do segundo fator",
      "Guarde em local seguro. Cada código pode ser usado uma única vez.",
      "",
      ...backupCodes,
      "",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "codigos-recuperacao-sistema-academico.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    goHome();
  }

  async function enable(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!password) {
      showError("setup", "Informe sua senha para gerar a chave.");
      return;
    }
    setBusy("setup");
    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error) {
        showError(
          "setup",
          result.error.code === "INVALID_PASSWORD" || result.error.message === "Invalid password"
            ? "Senha incorreta."
            : (result.error.message ?? "Não foi possível iniciar a configuração"),
        );
        return;
      }
      if (result.data?.method !== "totp") {
        showError("setup", "Método de segundo fator não suportado");
        return;
      }
      setTotpURI(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
      setCode("");
      setPassword("");
      let currentUserId = userId;
      if (!currentUserId) {
        const me = await fetch("/api/auth/me").catch(() => null);
        if (me?.ok) currentUserId = ((await me.json()) as { id?: string }).id ?? null;
      }
      if (currentUserId) {
        setUserId(currentUserId);
        savePendingTotpSetup({
          totpURI: result.data.totpURI,
          backupCodes: result.data.backupCodes,
          userId: currentUserId,
          createdAt: Date.now(),
        });
      }
    } catch {
      showError(
        "setup",
        "Não foi possível gerar a chave. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy("confirm");
    try {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        showError(
          "confirm",
          result.error.code === "INVALID_CODE"
            ? "Código inválido. Use os 6 dígitos do autenticador para a chave exibida acima."
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
      <div className={styles.state}>
        <PageHeader
          description="Guarde os códigos abaixo em local seguro. Cada código pode ser usado uma única vez. Depois de copiar ou baixar, você será levado ao início."
          eyebrow="Sistema Acadêmico"
          title="Segundo fator ativado"
        />
        <ul className={styles.backupCodes}>
          {backupCodes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <FormFeedback error={error?.scope === "done" ? error.message : null} />
        <div className={styles.actions}>
          <Button onClick={() => void copyCodes()} type="button">
            Copiar códigos
          </Button>
          <Button iconName="download" onClick={downloadCodes} type="button" variant="secondary">
            Baixar arquivo .txt
          </Button>
          <Button iconName="check" onClick={goHome} type="button" variant="tertiary">
            Já guardei, ir para o início
          </Button>
        </div>
      </div>
    );
  }

  if (totpURI) {
    return (
      <div className={styles.stack}>
        <form className={styles.form} onSubmit={confirm}>
          <PageHeader eyebrow="Sistema Acadêmico" title="Confirmar autenticador" />
          <ol className={styles.steps}>
            <li>Adicione a chave abaixo ao aplicativo autenticador (QR code ou chave manual).</li>
            <li>Digite neste formulário somente os 6 dígitos mostrados pelo aplicativo.</li>
          </ol>
          <div className={styles.qrBox}>
            <QRCodeSVG value={totpURI} size={208} level="M" includeMargin />
          </div>
          <details className={styles.mutedText}>
            <summary className={styles.summary}>
              Não consigo ler o QR code: usar a chave manual
            </summary>
            <p className={styles.detailText}>
              Essa chave vai no aplicativo — não é o código deste formulário.
            </p>
            <code className={styles.codeBlock}>{manualSecret(totpURI)}</code>
            <code className={styles.codeBlock}>{totpURI}</code>
          </details>
          <p className={styles.hint}>
            Digite o código assim que ele aparecer. Se não for aceito, confira a data/hora do
            aparelho.
          </p>
          <Field
            autoComplete="one-time-code"
            className={styles.codeField}
            disabled={busy !== null}
            inputMode="numeric"
            label="Código de 6 dígitos do aplicativo"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            required
            value={code}
          />
          <FormFeedback error={error?.scope === "confirm" ? error.message : null} />
          <Button className={styles.submit} disabled={busy !== null} type="submit">
            {busy === "confirm" ? "Confirmando..." : "Confirmar código"}
          </Button>
        </form>

        <details className={styles.regenerate}>
          <summary className={styles.summary}>Gerar outra chave</summary>
          <form className={styles.regenerateForm} onSubmit={enable}>
            <p className={styles.detailText}>
              Informe sua senha para gerar outra chave. Depois, exclua a entrada antiga do
              autenticador e leia o novo QR code.
            </p>
            <Field
              disabled={busy !== null}
              label="Senha atual"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            <FormFeedback error={error?.scope === "setup" ? error.message : null} />
            <Button disabled={busy !== null} type="submit">
              {busy === "setup" ? "Gerando chave..." : "Gerar nova chave"}
            </Button>
          </form>
        </details>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={enable}>
      <PageHeader
        description="Perfis administrativos, professores, auditores e suporte técnico exigem TOTP. Confirme sua senha para gerar a chave."
        eyebrow="Sistema Acadêmico"
        title="Configurar segundo fator"
      />
      <Field
        disabled={busy !== null}
        label="Senha atual"
        onChange={(event) => setPassword(event.target.value)}
        required
        type="password"
        value={password}
      />
      <FormFeedback error={error?.scope === "setup" ? error.message : null} />
      <Button className={styles.submit} disabled={busy !== null} type="submit">
        {busy === "setup" ? "Gerando chave..." : "Gerar chave TOTP"}
      </Button>
    </form>
  );
}
