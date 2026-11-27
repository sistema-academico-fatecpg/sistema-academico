"use client";

import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
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
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"confirm" | "setup" | null>(null);
  const [done, setDone] = useState(false);

  // A sessão já foi criada no login; não há necessidade de pedir a senha
  // novamente para ler/gerar a chave TOTP.
  const generate = useCallback(async () => {
    setBusy("setup");
    setError(null);
    try {
      const response = await fetch("/api/auth/mfa/setup", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as {
        totpURI?: string;
        backupCodes?: string[];
        error?: string;
      };
      if (!response.ok || !data.totpURI || !data.backupCodes) {
        setError(data.error ?? "Não foi possível gerar a chave do autenticador.");
        return;
      }
      setTotpURI(data.totpURI);
      setBackupCodes(data.backupCodes);
      setCode("");
    } catch {
      setError("Não foi possível gerar a chave. Verifique sua conexão e tente novamente.");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    void generate();
  }, [generate]);

  function goHome() {
    router.push("/dashboard");
    router.refresh();
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      goHome();
    } catch {
      setError("Não foi possível copiar. Use o botão Baixar ou anote os códigos abaixo.");
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

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy("confirm");
    try {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setError(
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
        setError("Não foi possível registrar os códigos de recuperação. Procure a secretaria.");
        return;
      }
      setDone(true);
    } catch {
      setError("Não foi possível confirmar o código. Verifique sua conexão e tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  if (done) {
    return (
      <div className={styles.state}>
        <PageHeader
          description="Guarde os códigos abaixo em local seguro. Cada código pode ser usado uma única vez."
          eyebrow="Sistema Acadêmico"
          title="Segundo fator ativado"
        />
        <ul className={styles.backupCodes}>
          {backupCodes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <FormFeedback error={error} />
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

  if (!totpURI) {
    return (
      <div className={styles.state}>
        <PageHeader
          description="A chave do autenticador é gerada com a sua sessão atual, sem pedir a senha novamente."
          eyebrow="Sistema Acadêmico"
          title="Configurar segundo fator"
        />
        <FormFeedback error={error} />
        <Button
          iconName="shield"
          isLoading={busy === "setup"}
          onClick={() => void generate()}
          type="button"
        >
          Gerar chave do autenticador
        </Button>
      </div>
    );
  }

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
          inputMode="numeric"
          label="Código de 6 dígitos do aplicativo"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          required
          value={code}
        />
        <FormFeedback error={error} />
        <Button disabled={busy === "confirm"} type="submit">
          Confirmar código
        </Button>
      </form>
      <Button
        iconName="shield"
        onClick={() => void generate()}
        type="button"
        variant="secondary"
        disabled={busy !== null}
      >
        Gerar nova chave
      </Button>
    </div>
  );
}
