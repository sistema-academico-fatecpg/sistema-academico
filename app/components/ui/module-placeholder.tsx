import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";

/**
 * Substitui as três páginas idênticas de "integração de interface"
 * (cursos, disciplinas, períodos), que só mudavam título, descrição e endpoint.
 */
export function ModulePlaceholder({
  title,
  description,
  endpoint,
  roles,
}: {
  title: string;
  description: string;
  endpoint: string;
  roles: string;
}) {
  return (
    <section className="space-y-6">
      <PageHeader title={title} description={description} />
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Serviço do módulo</h2>
            <p className="mt-1 text-sm text-slate-500">
              A interface utiliza os serviços existentes do projeto; as regras de autorização devem
              ser aplicadas novamente no servidor.
            </p>
          </div>
          <Badge>Integração de interface</Badge>
        </div>
        <div className="mt-5 rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Endpoint existente
          </p>
          <code className="mt-1 block text-sm text-[#6b1720]">{endpoint}</code>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Perfis previstos: {roles}. A autorização efetiva depende das permissões concedidas no
          servidor, não apenas da visibilidade desta tela.
        </p>
      </Panel>
    </section>
  );
}
