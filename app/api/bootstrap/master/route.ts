import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { bootstrapMaster } from "@/app/lib/auth/bootstrap";
import { getClientIp } from "@/app/lib/request-context";
import { assertMaintenanceSecret } from "@/app/lib/security/maintenance";
import { InstitucionalEmailSchema } from "@/app/types/common";

const BootstrapSchema = z.object({
  name: z.string().trim().min(3).max(150),
  email: InstitucionalEmailSchema,
});

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
