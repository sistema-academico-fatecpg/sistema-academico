import { z } from "zod";
import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { AccountService, visibleRolesFor } from "@/app/lib/auth/account-service";
import { generateInstitutionalEmail } from "@/app/lib/auth/institutional-email";
import { requirePermission } from "@/app/lib/auth/session";
import { UserRepository, type UserWithRoles } from "@/app/repositories/user.repository";
import { PERMISSIONS } from "@/app/types/roles";
import { CreateUserRequestSchema, ListUsersQuerySchema, type UserInput } from "@/app/types/user";

function toDto(user: UserWithRoles) {
  const roles = user.roles.map((userRole) => userRole.role.name);
  return {
    id: user.id,
    name: user.name,
    socialName: user.socialName,
    email: user.email,
    institutionalEmail: user.email,
    personalEmail: user.personalEmail,
    registrationNumber: user.registrationNumber,
    role: roles[0] ?? null,
    roles,
    status: user.status,
    mfaEnabled: user.twoFactorEnabled,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.USERS_READ);
    const url = new URL(request.url);
    const query = ListUsersQuerySchema.parse(Object.fromEntries(url.searchParams));
    // Admin Master revisa todos os perfis, inclusive os criados em runtime (7.2).
    const visibleRoles = actor.roles.includes("ADMIN_MASTER") ? null : visibleRolesFor(actor.roles);
    const result = await new UserRepository().list(query, visibleRoles);

    return Response.json({
      items: result.items.map(toDto),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (error) {
    return jsonError(error);
  }
}

const CreateUserBodySchema = CreateUserRequestSchema.extend({
  requestReason: z.string().trim().min(10).max(2000).optional(),
  // 8.8.4: necessário em modo de conta única / contingência.
  authorizationDocument: z.string().trim().max(255).optional(),
});

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.USERS_CREATE);
    const { requestReason, authorizationDocument, ...body } = CreateUserBodySchema.parse(
      await request.json(),
    );
    const users = new UserRepository();

    // A matrícula é gerada automaticamente pelo servidor, com índice crescente
    // por cargo. O valor enviado pelo cliente é ignorado.
    const registrationNumber = await users.nextRegistrationNumber(body.role);
    const email = await generateInstitutionalEmail(body.name, async (candidate) =>
      Boolean(await users.findByEmail(candidate)),
    );
    const input: UserInput = {
      name: body.name,
      socialName: body.socialName ?? null,
      email,
      personalEmail: body.personalEmail,
      registrationNumber,
      role: body.role,
    };
    const result = await new AccountService().createUser(
      input,
      actorFrom(actor, request),
      requestReason,
      authorizationDocument,
    );

    if (result.kind === "PENDING_APPROVAL") {
      return Response.json(
        {
          status: "PENDING_APPROVAL",
          requestId: result.requestId,
          message: "Cadastro enviado para dupla aprovação",
        },
        { status: 202 },
      );
    }

    return Response.json(
      { status: result.kind, user: toDto(result.user) },
      { status: result.kind === "CREATED" ? 201 : 200 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
