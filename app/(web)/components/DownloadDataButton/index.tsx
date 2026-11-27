"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { FormFeedback } from "@/components/FormFeedback";
import styles from "./styles.module.scss";

/**
 * 11.1.4: baixa a cópia transportável dos dados do próprio titular. Busca a
 * API com a sessão atual (sem id na URL) e salva o CSV no navegador.
 */
export function DownloadDataButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/data-subject/me?format=csv", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Não foi possível gerar a cópia dos seus dados.");

      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Não foi possível baixar a cópia. Tente novamente ou contate o suporte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <Button
        type="button"
        variant="primary"
        iconName="download"
        onClick={handleDownload}
        isLoading={loading}
      >
        Baixar meus dados (CSV)
      </Button>
      <FormFeedback error={error} />
    </div>
  );
}
