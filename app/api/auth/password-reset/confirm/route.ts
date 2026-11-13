import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { AccountService } from "@/app/lib/auth/account-service";
import { getClientIp } from "@/app/lib/request-context";

const ConfirmSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  try {
    const body = ConfirmSchema.parse(await request.json());
    await new AccountService().resetPassword({ ...body, ipAddress: getClientIp(request) });
    return Response.json({ status: "RESET" });
  } catch (error) {
    return jsonError(error);
  }
}
