import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Aviso de Privacidade · Sistema Acadêmico",
  description: "Aviso de privacidade e direitos dos titulares de dados pessoais (LGPD).",
};

const DPO_EMAIL = process.env.DPO_EMAIL ?? "dpo@academico.com";

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <PageHeader eyebrow="LGPD · arts. 9º e 41" title="Aviso de Privacidade" />
      <p className={styles.text}>
        O Sistema Acadêmico trata dados pessoais de alunos, professores e colaboradores para
        executar o contrato educacional, cumprir obrigações legais e manter o acervo acadêmico.
        Coletamos apenas os dados necessários à vida acadêmica.
      </p>

      <div className={styles.sections}>
        <Panel className={styles.section}>
          <h2 className={styles.sectionTitle}>Quais dados tratamos</h2>
          <ul className={styles.list}>
            <li>Identificação: nome civil, nome social, matrícula e e-mail institucional.</li>
            <li>Vida acadêmica: cursos, períodos, disciplinas, matrículas, notas e histórico.</li>
            <li>Segurança: registros de acesso, endereço IP e eventos de auditoria.</li>
            <li>
              Dados sensíveis eventualmente necessários (ex.: laudos de acessibilidade) são
              criptografados e de acesso restrito.
            </li>
          </ul>
        </Panel>

        <Panel className={styles.section}>
          <h2 className={styles.sectionTitle}>Seus direitos</h2>
          <p className={styles.text}>
            Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade, cópia e,
            quando cabível, eliminação dos seus dados. O acervo acadêmico é conservado pelos prazos
            legais do Decreto nº 9.235/2017 e da Portaria MEC nº 315/2018.
          </p>
          <p className={styles.text}>
            Solicitações podem ser feitas pelo e-mail do Encarregado de Dados ou presencialmente na
            secretaria, com comprovação de identidade.
          </p>
        </Panel>

        <Panel className={styles.section}>
          <h2 className={styles.sectionTitle}>Encarregado de Dados (DPO)</h2>
          <p className={styles.text}>
            Contato:{" "}
            <a className={styles.link} href={`mailto:${DPO_EMAIL}`}>
              {DPO_EMAIL}
            </a>
            .
          </p>
        </Panel>

        <Panel className={styles.section}>
          <h2 className={styles.sectionTitle}>Segurança</h2>
          <p className={styles.text}>
            O acesso é individual, com segundo fator para perfis que tratam dados de outras pessoas.
            Toda ação é registrada em trilha de auditoria imutável. Em caso de incidente com risco
            relevante, a ANPD e os titulares são comunicados nos prazos legais.
          </p>
        </Panel>
      </div>
    </main>
  );
}
