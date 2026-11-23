import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { bootstrapMaster } from "@/app/lib/auth/bootstrap";
import { AuthError } from "@/app/lib/auth/errors";
import { getClientIp } from "@/app/lib/request-context";
import { InstitucionalEmailSchema } from "@/app/types/common";

const BootstrapSchema = z.object({
  name: z.string().trim().min(3).max(150),
  email: InstitucionalEmailSchema,
});

function assertMaintenanceSecret(request: Request) {
  const expected = process.env.MAINTENANCE_SECRET;
  const provided = request.headers.get("x-maintenance-secret") ?? "";
  if (!expected || expected.length < 16) {
    throw new AuthError("Rotina indisponível", "FORBIDDEN", 403);
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AuthError("Rotina indisponível", "FORBIDDEN", 403);
  }
}

export async function POST(request: Request) {
  try {
    assertMaintenanceSecret(request);
    const body = BootstrapSchema.parse(await request.json());
    const user = await bootstrapMaster({ ...body, ipAddress: getClientIp(request) });
    return Response.json({ status: "PENDING_ACTIVATION", userId: user.id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
