import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { AccountService } from "@/app/lib/auth/account-service";
import { getClientIp } from "@/app/lib/request-context";

const ActivateSchema = z.object({
  token: z.string().min(20).max(200),
  code: z.string().regex(/^\d{6}$/, "Informe o código de 6 dígitos"),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  try {
    const body = ActivateSchema.parse(await request.json());
    const user = await new AccountService().activate({
      ...body,
      ipAddress: getClientIp(request),
    });
    const roles = user.roles.map((userRole) => userRole.role.name);
    return Response.json({
      status: "ACTIVE",
      user: { id: user.id, name: user.name, email: user.email, roles },
      requiresTwoFactorSetup: !roles.includes("ALUNO"),
    });
  } catch (error) {
    return jsonError(error);
  }
}
