export const instant = false;

import type { Metadata } from "next";
export const metadata: Metadata = { title: "Auditoria e registros" };
export default function Page() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
          Módulo institucional
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Auditoria e registros
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Consulta restrita ao perfil Auditor. Os registros devem permanecer íntegros e rastreáveis.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Serviço do módulo</h2>
            <p className="mt-1 text-sm text-slate-500">
              A interface utiliza os serviços existentes do projeto; as regras de autorização devem
              ser aplicadas novamente no servidor.
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            Integração de interface
          </span>
        </div>
        <div className="mt-5 rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Endpoint existente
          </p>
          <code className="mt-1 block text-sm text-[#6b1720]">/api/logs</code>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Perfis previstos: AUDITOR. A autorização efetiva depende das permissões concedidas no
          servidor, não apenas da visibilidade desta tela.
        </p>
      </div>
    </section>
  );
}
