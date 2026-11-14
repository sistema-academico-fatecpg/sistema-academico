"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface Log {
  id: string;
  userId: string | null;
  role: string | null;
  ipAddress: string;
  action: string;
  module: string;
  recordType: string | null;
  recordId: string | null;
  result: string;
  createdAt: string;
}

interface LogsResponse {
  logs: Log[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function LogTable() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const response: LogsResponse = await api.getLogs({
        page,
        limit: 50,
        ...(moduleFilter && { module: moduleFilter }),
        ...(actionFilter && { action: actionFilter }),
      });

      setLogs(response.logs);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getResultBadge = (result: string) => {
    return <Badge variant={result === "SUCCESS" ? "default" : "destructive"}>{result}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="w-full sm:w-48"
        >
          <option value="">Todos os módulos</option>
          <option value="USERS">Usuários</option>
          <option value="COURSES">Cursos</option>
          <option value="PERIODS">Períodos</option>
          <option value="SUBJECTS">Disciplinas</option>
          <option value="ENROLLMENTS">Matrículas</option>
          <option value="GRADES">Notas</option>
          <option value="AUDIT_LOGS">Logs de Auditoria</option>
          <option value="BACKUPS">Backups</option>
        </select>
        <input
          type="search"
          placeholder="Filtrar por ação..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      <DataTable
        data={logs}
        isLoading={loading}
        keyExtractor={(log) => log.id}
        columns={[
          {
            key: "createdAt",
            header: "Data/Hora",
            render: (l) => new Date(l.createdAt).toLocaleString("pt-BR"),
          },
          { key: "userId", header: "Usuário", render: (l) => l.userId || "-" },
          { key: "role", header: "Papel", render: (l) => l.role || "-" },
          { key: "ipAddress", header: "IP", render: (l) => l.ipAddress },
          { key: "action", header: "Ação", render: (l) => l.action },
          { key: "module", header: "Módulo", render: (l) => l.module },
          { key: "recordType", header: "Tipo Registro", render: (l) => l.recordType || "-" },
          { key: "recordId", header: "ID Registro", render: (l) => l.recordId || "-" },
          { key: "result", header: "Resultado", render: (l) => getResultBadge(l.result) },
        ]}
      />

      <div className="flex items-center justify-between">
        <span>
          Página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 text-sm border rounded disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 text-sm border rounded disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
