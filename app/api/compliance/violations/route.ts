import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { requirePermission } from "@/app/lib/auth/session";
import { db } from "@/app/lib/db";
import { recordPolicyViolation } from "@/app/lib/security/compliance-service";
import { PERMISSIONS } from "@/app/types/roles";

const ViolationSchema = z.object({
  userId: z.string().uuid(),
  rule: z.string().trim().min(2).max(200),
  description: z.string().trim().min(10).max(2000),
  sanction: z.enum(["ADVERTENCIA", "BLOQUEIO", "MEDIDA_DISCIPLINAR"]),
  blockAccount: z.boolean().default(false),
});

/** 15: registro de descumprimento e sanção aplicada. */
export async function GET() {
  try {
    await requirePermission(PERMISSIONS.USERS_READ);
    const items = await db.policyViolation.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.USERS_UPDATE);
    const body = ViolationSchema.parse(await request.json());
    const ctx = actorFrom(actor, request);
    const record = await recordPolicyViolation(
      { id: ctx.actorId, roles: ctx.actorRoles, ipAddress: ctx.ipAddress },
      body,
    );
    return Response.json({ status: "RECORDED", record }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
