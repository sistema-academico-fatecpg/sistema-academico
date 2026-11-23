import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { AccountService } from "@/app/lib/auth/account-service";
import { getClientIp } from "@/app/lib/request-context";
import { EmailSchema } from "@/app/types/common";

const RequestSchema = z.object({ email: EmailSchema });

export async function POST(request: Request) {
  try {
    const body = RequestSchema.parse(await request.json());
    await new AccountService().requestPasswordReset(body.email, getClientIp(request));
    // Resposta genérica para não revelar existência da conta.
    return Response.json({
      status: "SENT",
      message: "Se a conta existir, enviaremos um link de redefinição.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
