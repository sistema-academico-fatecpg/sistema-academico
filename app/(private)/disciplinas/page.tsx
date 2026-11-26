export const instant = false;

import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export const metadata: Metadata = { title: "Disciplinas" };

export default function Page() {
  return (
    <ModulePlaceholder
      title="Disciplinas"
      description="Componentes curriculares vinculados aos cursos e períodos."
      endpoint="/api/subjects"
      roles="ADMIN_MASTER, ADMIN_SECUNDARIO"
    />
  );
}
