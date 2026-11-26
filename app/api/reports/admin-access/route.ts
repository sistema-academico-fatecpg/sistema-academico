import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { createAuditService } from "@/app/lib/audit";
import { adminAccessReport } from "@/app/lib/audit/admin-access-report";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { forbidden } from "@/app/lib/auth/errors";
import { requireUser } from "@/app/lib/auth/session";

/**
 * 8.7.3: emissão do relatório semestral para revisão do Admin Master, com
 * acompanhamento do Auditor. Cada emissão fica registrada na própria trilha.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireUser();
    if (!actor.roles.includes("ADMIN_MASTER") && !actor.roles.includes("AUDITOR")) {
      throw forbidden("Relatório restrito ao Admin Master e ao Auditor");
    }
    const format = z
      .enum(["json", "csv"])
      .default("json")
      .parse(new URL(request.url).searchParams.get("format") ?? "json");
    const report = await adminAccessReport();
    const ctx = actorFrom(actor, request);
    await createAuditService().record({
      ...auditActor({ ...actor, ipAddress: ctx.ipAddress }),
      action: AUDIT_ACTIONS.ADMIN_ACCESS_REPORT_VIEWED,
      module: "REPORTS",
      recordType: "AdminAccessReport",
      result: "SUCCESS",
      newValue: { totalEvents: report.totalEvents, format, reviewedBy: actor.roles[0] ?? null },
    });

    if (format === "csv") {
      const header = "id,userId,role,action,module,result,createdAt";
      const rows = report.items.map((item) =>
        [
          item.id,
          item.userId ?? "",
          item.role ?? "",
          item.action,
          item.module,
          item.result,
          item.createdAt,
        ].join(","),
      );
      return new Response([header, ...rows].join("\n"), {
        headers: { "content-type": "text/csv; charset=utf-8" },
      });
    }
    return Response.json(report);
  } catch (error) {
    return jsonError(error);
  }
}
