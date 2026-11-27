import { Suspense } from "react";
import { requirePageUser } from "@/app/lib/auth/page-guard";
import { Shell } from "@/components/Shell";
import { roleLabel } from "@/web/lib/labels";
import styles from "./layout.module.scss";

const navigation = [
  {
    href: "/dashboard",
    label: "Visão geral",
    icon: "dashboard",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO", "AUDITOR", "SUPORTE_TECNICO"],
  },
  {
    href: "/usuarios",
    label: "Usuários",
    icon: "users",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO"],
  },
  { href: "/perfis", label: "Perfis e permissões", icon: "security", roles: ["ADMIN_MASTER"] },
  {
    href: "/cursos",
    label: "Cursos",
    icon: "subjects",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "ALUNO", "PROFESSOR"],
  },
  {
    href: "/periodos",
    label: "Períodos",
    icon: "calendar",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "ALUNO", "PROFESSOR"],
  },
  {
    href: "/disciplinas",
    label: "Disciplinas",
    icon: "book",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "ALUNO", "PROFESSOR"],
  },
  {
    href: "/matriculas",
    label: "Matrículas",
    icon: "academic",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO"],
  },
  {
    href: "/notas",
    label: "Notas",
    icon: "grades",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO"],
  },
  { href: "/aprovacoes", label: "Aprovações", icon: "check", roles: ["ADMIN_MASTER", "AUDITOR"] },
  { href: "/auditoria", label: "Auditoria", icon: "activity", roles: ["AUDITOR"] },
  {
    href: "/suporte",
    label: "Acesso de suporte",
    icon: "help",
    roles: ["AUDITOR", "SUPORTE_TECNICO"],
  },
  { href: "/incidentes", label: "Incidentes", icon: "alert", roles: ["ADMIN_MASTER", "AUDITOR"] },
  {
    href: "/relatorios",
    label: "Relatório semestral",
    icon: "report",
    roles: ["ADMIN_MASTER", "AUDITOR"],
  },
  {
    href: "/responsabilidades",
    label: "Responsabilidades",
    icon: "shield",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO", "AUDITOR", "SUPORTE_TECNICO"],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className={styles.fallback} aria-hidden="true" />}>
      <PrivateShell>{children}</PrivateShell>
    </Suspense>
  );
}

async function PrivateShell({ children }: { children: React.ReactNode }) {
  const actor = await requirePageUser();
  const links = navigation
    .filter((item) =>
      item.roles.some((role) => actor.roles.includes(role as (typeof actor.roles)[number])),
    )
    .map(({ href, label, icon }) => ({ href, label, icon }));

  return (
    <Shell
      userName={actor.user.socialName || actor.name}
      roleLabel={roleLabel(actor.roles)}
      links={links}
    >
      {children}
    </Shell>
  );
}
