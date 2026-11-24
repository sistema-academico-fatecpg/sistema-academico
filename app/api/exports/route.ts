import { z } from "zod";
import { ExportService } from "@/app/lib/academic/export-service";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requirePermission, requireUser } from "@/app/lib/auth/session";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { getClientIp } from "@/app/lib/request-context";
import { PERMISSIONS } from "@/app/types/roles";

const ScopeSchema = z.enum(["ENROLLMENTS", "GRADES", "USERS"]);

const GetSchema = z.object({
  scope: ScopeSchema.optional(),
  requestId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  classGroupId: z.string().uuid().optional(),
  status: z.string().trim().max(30).optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

const MassBodySchema = z.object({
  scope: ScopeSchema,
  filters: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().trim().min(10).max(2000),
});

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escapeCsv = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
  ].join("\n");
}

export async function GET(request: Request) {
  try {
    const query = GetSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const service = new ExportService();

    if (query.requestId) {
      const actor = await requireUser();
      const ctx = actorFrom(actor, request);
      const rows = await service.massExport(
        { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
        query.requestId,
      );
      if (query.format === "csv") {
        return new Response(csv(rows), {
          headers: { "content-type": "text/csv; charset=utf-8" },
        });
      }
      return Response.json({ items: rows });
    }

    if (!query.scope) {
      return Response.json({ error: "scope ou requestId é obrigatório" }, { status: 400 });
    }
    const permission =
      query.scope === "ENROLLMENTS"
        ? PERMISSIONS.ENROLLMENTS_EXPORT
        : query.scope === "GRADES"
          ? PERMISSIONS.GRADES_EXPORT
          : PERMISSIONS.REPORTS_EXPORT;
    const actor = await requirePermission(permission);
    const ctx = actorFrom(actor, request);
    const rows = await service.simpleExport(
      { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
      query.scope,
      {
        studentId: query.studentId,
        classGroupId: query.classGroupId,
        status: query.status,
      },
    );
    if (query.format === "csv") {
      return new Response(csv(rows), {
        headers: { "content-type": "text/csv; charset=utf-8" },
      });
    }
    return Response.json({ items: rows });
  } catch (error) {
    return jsonError(error);
  }
}

/** 9.4.2: exportação em massa cria solicitação de dupla aprovação. */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
    const body = MassBodySchema.parse(await request.json());
    const created = await new CriticalOperationService().request(
      {
        id: actor.id,
        roles: actor.roles,
        ipAddress: getClientIp(request),
        permissions: actor.permissions,
      },
      {
        operation: "MASS_PERSONAL_DATA_EXPORT",
        module: "REPORTS",
        recordType: "Export",
        reason: body.reason,
        payload: { scope: body.scope, filters: body.filters ?? {} },
      },
    );
    return Response.json({ status: "PENDING_APPROVAL", requestId: created.id }, { status: 202 });
  } catch (error) {
    return jsonError(error);
  }
}
