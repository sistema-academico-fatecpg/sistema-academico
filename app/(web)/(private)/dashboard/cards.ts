import type { RoleName } from "@/app/types/common";

export type DashboardCardItem = {
  href: string;
  title: string;
  description: string;
  roles: readonly RoleName[];
  icon: string;
};

export const DASHBOARD_CARDS: readonly DashboardCardItem[] = [
  {
    href: "/usuarios",
    title: "Usuários",
    description: "Contas, perfis e ciclo de vida.",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO"],
    icon: "01",
  },
  {
    href: "/perfis",
    title: "Perfis e permissões",
    description: "Perfis novos vazios e alterações com dupla aprovação.",
    roles: ["ADMIN_MASTER"],
    icon: "01a",
  },
  {
    href: "/cursos",
    title: "Cursos",
    description: "Estrutura e oferta acadêmica.",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "ALUNO", "PROFESSOR"],
    icon: "02",
  },
  {
    href: "/periodos",
    title: "Períodos",
    description: "Calendário e janelas acadêmicas.",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "ALUNO", "PROFESSOR"],
    icon: "03",
  },
  {
    href: "/disciplinas",
    title: "Disciplinas",
    description: "Componentes curriculares e turmas.",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "ALUNO", "PROFESSOR"],
    icon: "04",
  },
  {
    href: "/matriculas",
    title: "Matrículas",
    description: "Vínculos acadêmicos e dependências.",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO"],
    icon: "05",
  },
  {
    href: "/notas",
    title: "Notas",
    description: "Lançamento, consulta e histórico.",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO"],
    icon: "06",
  },
  {
    href: "/aprovacoes",
    title: "Operações críticas",
    description: "Solicitações e decisões com dupla aprovação.",
    roles: ["ADMIN_MASTER", "AUDITOR"],
    icon: "07",
  },
  {
    href: "/auditoria",
    title: "Auditoria",
    description: "Registros, alertas e rastreabilidade.",
    roles: ["AUDITOR"],
    icon: "08",
  },
  {
    href: "/suporte",
    title: "Acesso excepcional",
    description: "Concessões temporárias e escopo limitado.",
    roles: ["AUDITOR", "SUPORTE_TECNICO"],
    icon: "09",
  },
  {
    href: "/incidentes",
    title: "Incidentes",
    description: "Comunicação, contenção e restauração autorizada.",
    roles: ["ADMIN_MASTER", "AUDITOR"],
    icon: "10",
  },
  {
    href: "/relatorios",
    title: "Relatório semestral",
    description: "Revisão de acessos administrativos.",
    roles: ["ADMIN_MASTER", "AUDITOR"],
    icon: "11",
  },
  {
    href: "/responsabilidades",
    title: "Responsabilidades",
    description: "Atribuições e revisão anual da política.",
    roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "PROFESSOR", "ALUNO", "AUDITOR", "SUPORTE_TECNICO"],
    icon: "12",
  },
];
