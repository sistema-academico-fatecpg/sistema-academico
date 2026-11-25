import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requireUser } from "@/app/lib/auth/session";
import { DataSubjectService } from "@/app/lib/security/data-subject-service";

/**
 * 11.1.4: consulta e cópia dos próprios dados. O identificador vem da sessão;
 * `?format=csv` devolve uma cópia transportável (LGPD art. 18).
 */
export async function GET(request: Request) {
  try {
    const actor = await requireUser();
    const ctx = actorFrom(actor, request);
    const data = await new DataSubjectService().ownData({
      id: ctx.actorId,
      roles: ctx.actorRoles,
      ipAddress: ctx.ipAddress,
    });
    const format = z
      .enum(["json", "csv"])
      .default("json")
      .parse(new URL(request.url).searchParams.get("format") ?? "json");

    if (format === "csv") {
      const rows = [
        ["campo", "valor"],
        ["id", data.id],
        ["nome", data.name],
        ["nomeSocial", data.socialName ?? ""],
        ["email", data.email],
        ["emailPessoal", data.personalEmail ?? ""],
        ["matricula", data.registrationNumber ?? ""],
        ["perfis", data.roles.join("|")],
        ["consentimentoResponsavel", data.guardianConsentAt?.toISOString() ?? ""],
        ...data.enrollments.flatMap((item) => [
          ["disciplina", `${item.subjectCode} - ${item.subjectName}`],
          ["situacao", item.status],
          ["nota", item.grade === null ? "" : String(item.grade)],
        ]),
      ];
      const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
      return new Response(rows.map((row) => row.map(escapeCsv).join(",")).join("\n"), {
        headers: { "content-type": "text/csv; charset=utf-8" },
      });
    }
    return Response.json(data);
  } catch (error) {
    return jsonError(error);
  }
}
