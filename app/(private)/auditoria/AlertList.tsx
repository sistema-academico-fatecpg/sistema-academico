import { Panel } from "@/components/ui/panel";
import { AcknowledgeButton } from "./AcknowledgeButton";

export function AlertList({
  items,
  canAcknowledge,
}: {
  items: readonly unknown[];
  canAcknowledge: boolean;
}) {
  return (
    <Panel padding="p-5">
      <h2 className="font-semibold text-slate-900">Alertas pendentes</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((alert) => {
          const item = alert as Record<string, unknown>;
          return (
            <li
              className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2"
              key={String(item.id)}
            >
              <span>
                <span className="font-semibold">{String(item.type)}</span> — {String(item.message)}
              </span>
              {canAcknowledge ? <AcknowledgeButton id={String(item.id)} /> : null}
            </li>
          );
        })}
        {items.length === 0 ? <li className="text-slate-500">Nenhum alerta pendente.</li> : null}
      </ul>
    </Panel>
  );
}
