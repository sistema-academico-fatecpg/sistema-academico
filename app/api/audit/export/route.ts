import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { auditReader } from "@/app/lib/audit/reader";
import { SupportAccessService } from "@/app/lib/audit/support-access-service";
import { requireAuditReader } from "@/app/lib/auth/session";
import { LogFilterSchema } from "@/app/types/log";

const ExportSchema = LogFilterSchema.extend({
  format: z.enum(["json", "csv"]).default("json"),
});

function csv(rows: unknown[]): string {
  if (rows.length === 0 || typeof rows[0] !== "object" || rows[0] === null) return "";
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const escapeCsv = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv((row as Record<string, unknown>)[header])).join(","),
    ),
  ].join("\n");
}

/** 10.4: emissão de relatório pelo Auditor, também registrada em log. */
export async function GET(request: Request) {
  try {
    const actor = await requireAuditReader();
    const query = ExportSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const ctx = actorFrom(actor, request);
    await new SupportAccessService().assertCanRead(
      { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
      "AUDIT_LOGS",
    );
    const result = await auditReader().findMany({ ...query, pageSize: 200 });
    await createAuditService().record({
      userId: actor.id as never,
      role: "AUDITOR",
      ipAddress: ctx.ipAddress,
      action: AUDIT_ACTIONS.EXPORT,
      module: "AUDIT_LOGS",
      recordType: "Log",
      result: "SUCCESS",
      newValue: { format: query.format, count: result.items.length },
    });

    if (query.format === "csv") {
      return new Response(csv(result.items), {
        headers: { "content-type": "text/csv; charset=utf-8" },
      });
    }
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
