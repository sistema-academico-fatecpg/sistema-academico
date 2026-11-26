"use client";

import { useEffect } from "react";

/** Fallback para exceções não capturadas: mensagem genérica, sem detalhes internos. */
export default function GlobalError({ error, retry }: { error: Error; retry: () => void }) {
  const digest = "digest" in error && typeof error.digest === "string" ? error.digest : null;

  useEffect(() => {
    // Apenas o identificador do erro é seguro para o console do navegador.
    if (digest) console.error(`[app] erro não tratado (ref: ${digest})`);
  }, [digest]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "Arial, sans-serif", margin: 0, padding: 32 }}>
        <h1 style={{ fontSize: 20 }}>Erro interno</h1>
        <p>Não foi possível concluir a operação. Tente novamente.</p>
        {digest ? <p style={{ color: "#71717a", fontSize: 12 }}>Referência: {digest}</p> : null}
        <button type="button" onClick={retry} style={{ padding: "8px 16px", cursor: "pointer" }}>
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
