import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { AccountService } from "@/app/lib/auth/account-service";
import { loginWithPassword } from "@/app/lib/auth/login-service";
import { getClientIp } from "@/app/lib/request-context";
import type { RoleName } from "@/app/types/common";
import { requiresMfa } from "@/app/types/roles";

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
    const roles = user.roles.map((userRole) => userRole.role.name as RoleName);

    // A senha foi definida agora: abrimos a sessão sem exigir novo login.
    // Se o login falhar por qualquer motivo, a conta permanece ativa e o
    // titular é direcionado ao login — nunca devolvemos 500 após a ativação.
    let cookies: string[] = [];
    try {
      const login = await loginWithPassword({
        email: user.email,
        password: body.password,
        request,
      });
      cookies = login.headers.getSetCookie();
    } catch {
      cookies = [];
    }

    const response = Response.json({
      status: "ACTIVE",
      user: { id: user.id, name: user.name, email: user.email, roles },
      requiresTwoFactorSetup: requiresMfa(roles),
      sessionStarted: cookies.length > 0,
    });
    for (const cookie of cookies) response.headers.append("set-cookie", cookie);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
