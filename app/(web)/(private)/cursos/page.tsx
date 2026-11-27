export const instant = false;

import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components";

export const metadata: Metadata = { title: "Cursos" };

export default function Page() {
  return (
    <ModulePlaceholder
      title="Cursos"
      description="Estrutura dos cursos ofertados pela instituição."
      endpoint="/api/courses"
      roles="ADMIN_MASTER, ADMIN_SECUNDARIO"
    />
  );
}
