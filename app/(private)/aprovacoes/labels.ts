import type { CriticalOperationType } from "@/app/types/common";

export const OPERATION_LABELS: Record<CriticalOperationType, string> = {
  GRANT_REVOKE_ADMIN_PERMISSION: "Conceder/revogar perfil administrativo",
  INCLUDE_OR_REPLACE_ADMIN_MASTER: "Incluir/substituir Admin Master",
  GRADE_CORRECTION_AFTER_CLOSING: "Correção de nota após fechamento",
  ENROLLMENT_RULE_EXCEPTION: "Exceção às regras de matrícula",
  ACADEMIC_RECORD_DELETION: "Exclusão de registro acadêmico",
  MASS_PERSONAL_DATA_EXPORT: "Exportação em massa de dados pessoais",
  DATA_RESTORE_AFTER_INCIDENT: "Restauração de dados após incidente",
  RESET_SECOND_FACTOR: "Redefinição de segundo fator",
};

export function isEmergencyRequest(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  return (payload as Record<string, unknown>).emergency === true;
}

export function requiresDirectionAuthorization(request: {
  operation: string;
  payload: unknown;
}): boolean {
  if (request.operation !== "DATA_RESTORE_AFTER_INCIDENT") return false;
  if (!request.payload || typeof request.payload !== "object" || Array.isArray(request.payload)) {
    return false;
  }
  return (request.payload as Record<string, unknown>).involvesMaster === true;
}
