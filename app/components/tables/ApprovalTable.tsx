"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface CriticalOperation {
  id: string;
  requestedBy: string;
  approvedBy: string | null;
  operation: string;
  module: string | null;
  recordType: string | null;
  recordId: string | null;
  reason: string;
  status: string;
  requestedAt: string;
  decidedAt: string | null;
  executedAt: string | null;
}

interface CriticalOperationsResponse {
  requests: CriticalOperation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function ApprovalTable() {
  const [operations, setOperations] = useState<CriticalOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const fetchData = async () => {
    setLoading(true);
    try {
      const response: CriticalOperationsResponse = await api.getCriticalOperations({
        page,
        limit: 20,
        ...(statusFilter && { status: statusFilter }),
      });

      setOperations(response.requests);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error("Erro ao buscar operações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (operationId: string, action: "APPROVE" | "REJECT" | "EXECUTE") => {
    try {
      const actionMap: Record<string, string> = {
        APPROVE: "approveOperation",
        REJECT: "rejectOperation",
        EXECUTE: "executeOperation",
      };
      const apiMethod = actionMap[action];
      if (apiMethod && (api as any)[apiMethod]) {
        await (api as any)[apiMethod](operationId);
        fetchData();
      }
    } catch (error) {
      console.error("Erro ao processar operação:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: "outline",
      APPROVED: "default",
      REJECTED: "destructive",
      EXECUTED: "default",
      CANCELLED: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48"
        >
          <option value="PENDING">Pendentes</option>
          <option value="APPROVED">Aprovadas</option>
          <option value="REJECTED">Recusadas</option>
          <option value="EXECUTED">Executadas</option>
          <option value="CANCELLED">Canceladas</option>
        </select>
      </div>

      <DataTable
        data={operations}
        isLoading={loading}
        keyExtractor={(op) => op.id}
        columns={[
          {
            key: "requestedAt",
            header: "Solicitado em",
            render: (o) => new Date(o.requestedAt).toLocaleString("pt-BR"),
          },
          { key: "requestedBy", header: "Solicitado por", render: (o) => o.requestedBy },
          { key: "operation", header: "Operação", render: (o) => o.operation },
          { key: "module", header: "Módulo", render: (o) => o.module || "-" },
          { key: "recordType", header: "Tipo Registro", render: (o) => o.recordType || "-" },
          { key: "recordId", header: "ID Registro", render: (o) => o.recordId || "-" },
          { key: "reason", header: "Justificativa", render: (o) => o.reason },
          { key: "status", header: "Status", render: (o) => getStatusBadge(o.status) },
          {
            key: "actions",
            header: "Ações",
            render: (op) => (
              <div className="flex items-center gap-2">
                {op.status === "PENDING" && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAction(op.id, "APPROVE")}
                    >
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleAction(op.id, "REJECT")}
                    >
                      Negar
                    </Button>
                  </>
                )}
                {op.status === "APPROVED" && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAction(op.id, "EXECUTE")}
                  >
                    Executar
                  </Button>
                )}
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
