import { jsonError } from "@/app/lib/api/responses";
import { actorHasPermission, requirePermission, requireUser } from "@/app/lib/auth/session";
import { CriticalOperationService } from "@/app/lib/critical-operations/service";
import { getClientIp } from "@/app/lib/request-context";
import { CriticalOperationRequestRepository } from "@/app/repositories/critical-operation-request.repository";
import {
  ApprovalFilterSchema,
  CriticalOperationRequestInputSchema,
} from "@/app/types/critical-operation";
import { CRITICAL_OPERATION_PERMISSION, PERMISSIONS } from "@/app/types/roles";

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.ROLES_APPROVE);
    const url = new URL(request.url);
    const filter = ApprovalFilterSchema.parse(Object.fromEntries(url.searchParams));
    const service = new CriticalOperationService();
    const [result, masterStatus] = await Promise.all([
      new CriticalOperationRequestRepository().list(filter),
      service.masterStatus(),
    ]);

    return Response.json({
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      masterStatus,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    const input = CriticalOperationRequestInputSchema.parse(await request.json());
    const required = CRITICAL_OPERATION_PERMISSION[input.operation];
    if (!actorHasPermission(actor, required)) {
      return Response.json(
        { error: `Permissão ${required} necessária`, code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const service = new CriticalOperationService();
    const created = await service.request(
      {
        id: actor.id,
        roles: actor.roles,
        ipAddress: getClientIp(request),
        permissions: actor.permissions,
      },
      input,
    );

    return Response.json({ status: "PENDING", request: created }, { status: 202 });
  } catch (error) {
    return jsonError(error);
  }
}
