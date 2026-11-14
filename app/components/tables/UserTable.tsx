"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  institutionalEmail: string;
  registrationNumber: string | null;
  role: string;
  status: string;
  createdAt: string;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const response: UsersResponse = await api.getUsers({
        page,
        limit: 20,
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      });

      setUsers(response.users);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBlock = async (userId: string) => {
    if (!confirm("Tem certeza que deseja bloquear este usuário?")) return;
    try {
      await api.updateUser(userId, { status: "BLOCKED" });
      fetchData();
    } catch (error) {
      console.error("Erro ao bloquear:", error);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await api.updateUser(userId, { status: "ACTIVE" });
      fetchData();
    } catch (error) {
      console.error("Erro ao desbloquear:", error);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm("Tem certeza que deseja desativar este usuário? (Exclusão lógica)")) return;
    try {
      await api.deleteUser(userId);
      fetchData();
    } catch (error) {
      console.error("Erro ao desativar:", error);
    }
  };

  const handleAssignRole = async (userId: string, role: string) => {
    try {
      await api.assignRole(userId, role);
      fetchData();
    } catch (error) {
      console.error("Erro ao atribuir papel:", error);
    }
  };

  const _handleRemoveRole = async (userId: string, role: string) => {
    try {
      await api.removeRole(userId, role);
      fetchData();
    } catch (error) {
      console.error("Erro ao remover papel:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ACTIVE: "default",
      BLOCKED: "destructive",
      PENDING_ACTIVATION: "outline",
      INACTIVE: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    return <Badge variant="secondary">{role}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="search"
            placeholder="Buscar por nome, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-48"
        >
          <option value="">Todos os papéis</option>
          <option value="ADMIN_MASTER">Admin Master</option>
          <option value="ADMIN_SECUNDARIO">Admin Secundário</option>
          <option value="PROFESSOR">Professor</option>
          <option value="ALUNO">Aluno</option>
          <option value="AUDITOR">Auditor</option>
          <option value="SUPORTE_TECNICO">Suporte Técnico</option>
        </select>
      </div>

      <DataTable
        data={users}
        isLoading={loading}
        keyExtractor={(user) => user.id}
        columns={[
          { key: "name", header: "Nome", render: (u) => u.name },
          { key: "email", header: "Email", render: (u) => u.email },
          {
            key: "institutionalEmail",
            header: "Email Institucional",
            render: (u) => u.institutionalEmail,
          },
          { key: "role", header: "Papel", render: (u) => getRoleBadge(u.role) },
          { key: "status", header: "Status", render: (u) => getStatusBadge(u.status) },
          {
            key: "actions",
            header: "Ações",
            render: (user) => (
              <div className="flex items-center gap-2">
                <Button
                  variant={user.status === "BLOCKED" ? "default" : "destructive"}
                  size="sm"
                  onClick={() =>
                    user.status === "BLOCKED" ? handleUnblock(user.id) : handleBlock(user.id)
                  }
                >
                  {user.status === "BLOCKED" ? "Desbloquear" : "Bloquear"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleDeactivate(user.id)}>
                  Desativar
                </Button>
                <select
                  onChange={(e) => handleAssignRole(user.id, e.target.value)}
                  defaultValue=""
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="">+ Papel</option>
                  <option value="ADMIN_MASTER">Admin Master</option>
                  <option value="ADMIN_SECUNDARIO">Admin Secundário</option>
                  <option value="PROFESSOR">Professor</option>
                  <option value="ALUNO">Aluno</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="SUPORTE_TECNICO">Suporte Técnico</option>
                </select>
              </div>
            ),
          },
        ]}
      />

      <div className="flex items-center justify-between">
        <span>
          Página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
