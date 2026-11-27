export const instant = false;

import type { Metadata } from "next";
import { requirePageUser } from "@/app/lib/auth/page-guard";
import { DownloadDataButton, PageHeader, Panel } from "@/components";
import styles from "./styles.module.scss";

export const metadata: Metadata = { title: "Meus dados" };

/** 11.1.4: acesso e cópia dos próprios dados (LGPD art. 18). */
export default async function Page() {
  await requirePageUser();

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="LGPD · art. 18"
        title="Meus dados"
        description="Consulte e obtenha uma cópia transportável das informações que o sistema mantém sobre você."
      />

      <Panel padding="p-6">
        <h2 className={styles.title}>Cópia dos meus dados</h2>
        <p className={styles.text}>
          O arquivo CSV contém sua identificação, perfis, matrículas e notas, além dos seus dados
          sensíveis em texto puro. Nas telas do sistema esses valores continuam mascarados.
        </p>
        <DownloadDataButton />
        <p className={styles.note}>
          O download é gerado a partir da sua sessão: não há campo para informar outro usuário e não
          é possível obter dados de terceiros. O arquivo não é armazenado em cache. Para exercer
          outros direitos (correção, portabilidade ou eliminação), use os canais do{" "}
          <a href="/privacidade">Aviso de Privacidade</a>.
        </p>
      </Panel>
    </section>
  );
}
