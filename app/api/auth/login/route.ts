import { z } from "zod";
import { jsonError } from "@/app/lib/api/responses";
import { loginWithPassword } from "@/app/lib/auth/login-service";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  try {
    const body = LoginSchema.parse(await request.json());
    const response = await loginWithPassword({ ...body, request });
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
