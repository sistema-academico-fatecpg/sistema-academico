import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS, auditActor } from "@/app/lib/audit/audit-service";
import { auth } from "@/app/lib/auth/better-auth";
import { getAuthenticatedUser } from "@/app/lib/auth/session";
import { getClientIp } from "@/app/lib/request-context";

export async function POST(request: Request) {
  const actor = await getAuthenticatedUser(request.headers);

  const upstream = await (
    auth.api as unknown as {
      signOut: (options: { headers: Headers; asResponse: true }) => Promise<Response>;
    }
  ).signOut({ headers: request.headers, asResponse: true });

  if (actor) {
    await createAuditService().record({
      ...auditActor({ ...actor, ipAddress: getClientIp(request) }),
      action: AUDIT_ACTIONS.LOGOUT,
      module: "USERS",
      recordType: "User",
      recordId: actor.id,
      result: "SUCCESS",
    });
  }

  const response = new Response(null, {
    status: 303,
    headers: { location: new URL("/login", request.url).toString() },
  });
  for (const cookie of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
