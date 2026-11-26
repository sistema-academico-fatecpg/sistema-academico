import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso de Privacidade · Sistema Acadêmico",
  description: "Aviso de privacidade e direitos dos titulares de dados pessoais (LGPD).",
};

const DPO_EMAIL = process.env.DPO_EMAIL ?? "dpo@academico.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-slate-800">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
        LGPD · arts. 9º e 41
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Aviso de Privacidade</h1>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        O Sistema Acadêmico trata dados pessoais de alunos, professores e colaboradores para
        executar o contrato educacional, cumprir obrigações legais e manter o acervo acadêmico.
        Coletamos apenas os dados necessários à vida acadêmica.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Quais dados tratamos</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
          <li>Identificação: nome civil, nome social, matrícula e e-mail institucional.</li>
          <li>Vida acadêmica: cursos, períodos, disciplinas, matrículas, notas e histórico.</li>
          <li>Segurança: registros de acesso, endereço IP e eventos de auditoria.</li>
          <li>
            Dados sensíveis eventualmente necessários (ex.: laudos de acessibilidade) são
            criptografados e de acesso restrito.
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Seus direitos</h2>
        <p className="text-sm leading-6 text-slate-600">
          Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade, cópia e,
          quando cabível, eliminação dos seus dados. O acervo acadêmico é conservado pelos prazos
          legais do Decreto nº 9.235/2017 e da Portaria MEC nº 315/2018.
        </p>
        <p className="text-sm leading-6 text-slate-600">
          Solicitações podem ser feitas pelo e-mail do Encarregado de Dados ou presencialmente na
          secretaria, com comprovação de identidade.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Encarregado de Dados (DPO)</h2>
        <p className="text-sm leading-6 text-slate-600">
          Contato:{" "}
          <a className="font-medium text-[#6b1720] underline" href={`mailto:${DPO_EMAIL}`}>
            {DPO_EMAIL}
          </a>
          .
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Segurança</h2>
        <p className="text-sm leading-6 text-slate-600">
          O acesso é individual, com segundo fator para perfis que tratam dados de outras pessoas.
          Toda ação é registrada em trilha de auditoria imutável. Em caso de incidente com risco
          relevante, a ANPD e os titulares são comunicados nos prazos legais.
        </p>
      </section>
    </main>
  );
}
