export const instant = false;

import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export const metadata: Metadata = { title: "Períodos acadêmicos" };

export default function Page() {
  return (
    <ModulePlaceholder
      title="Períodos acadêmicos"
      description="Calendário letivo, matrícula e janela de lançamento de notas."
      endpoint="/api/periods"
      roles="ADMIN_MASTER, ADMIN_SECUNDARIO"
    />
  );
}
