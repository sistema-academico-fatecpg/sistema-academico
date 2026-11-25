import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { forbidden } from "@/app/lib/auth/errors";
import { requireUser } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db";
import { policyReviewReport, recordPolicyReview } from "@/app/lib/security/compliance-service";

const ReviewSchema = z.object({
  reason: z.string().trim().min(10).max(2000),
  notes: z.string().trim().max(2000).optional(),
});

/** 16: revisão anual (ou após incidente relevante). */
export async function GET() {
  try {
    const actor = await requireUser();
    if (!actor.roles.includes("ADMIN_MASTER") && !actor.roles.includes("AUDITOR")) {
      throw forbidden("Revisão restrita ao Admin Master e ao Auditor/DPO");
    }
    const [report, history] = await Promise.all([
      policyReviewReport(),
      db.policyReview.findMany({ orderBy: { reviewedAt: "desc" }, take: 20 }),
    ]);
    return Response.json({ ...report, history });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    if (!actor.roles.includes("ADMIN_MASTER") && !actor.roles.includes("AUDITOR")) {
      throw forbidden("Registro de revisão restrito ao Admin Master e ao Auditor/DPO");
    }
    const body = ReviewSchema.parse(await request.json());
    const ctx = actorFrom(actor, request);
    const record = await recordPolicyReview(
      { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
      body,
    );
    return Response.json({ status: "REVIEWED", record }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
