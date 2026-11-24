import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { auditReader } from "@/app/lib/audit/reader";
import { forbidden } from "@/app/lib/auth/errors";
import { requireUser } from "@/app/lib/auth/session";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    if (!actor.roles.includes("AUDITOR")) {
      throw forbidden("Somente o Auditor reconhece alertas");
    }
    const { id } = await ctx.params;
    const alert = await auditReader().acknowledgeAlert(z.string().uuid().parse(id));
    return Response.json({ status: "ACKNOWLEDGED", alert });
  } catch (error) {
    return jsonError(error);
  }
}
