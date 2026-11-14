"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApprovalTable } from "@/components/tables/ApprovalTable";
import { LogTable } from "@/components/tables/LogTable";
import { UserTable } from "@/components/tables/UserTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"users" | "logs" | "approvals" | "support">("users");
  const _router = useRouter();

  const tabs = [
    { id: "users", label: "Usuários", roles: ["ADMIN_MASTER", "ADMIN_SECUNDARIO"] },
    { id: "logs", label: "Logs de Auditoria", roles: ["AUDITOR", "ADMIN_MASTER"] },
    { id: "approvals", label: "Aprovações Pendentes", roles: ["ADMIN_MASTER"] },
    { id: "support", label: "Acessos de Suporte", roles: ["AUDITOR", "ADMIN_MASTER"] },
  ];

  const getToken = () => localStorage.getItem("token");
  const getRole = () => {
    const token = getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.role;
    } catch {
      return null;
    }
  };

  const role = getRole();

  if (!role) {
    return null; // Loading state
  }

  const visibleTabs = tabs.filter((tab) => tab.roles.includes(role));

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/auth/login";
    }
  }, [getToken]);

  const _currentTab = visibleTabs.find((tab) => tab.id === activeTab) || visibleTabs[0];

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Logado como {localStorage.getItem("userRole")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.href = "/auth/login";
                }}
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-2 overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {activeTab === "users" && <UserTable />}
        {activeTab === "logs" && <LogTable />}
        {activeTab === "approvals" && <ApprovalTable />}
        {activeTab === "support" && (
          <div className="text-center py-8 text-muted-foreground">Em desenvolvimento</div>
        )}
      </main>
    </div>
  );
}
