import { actorFrom, jsonError } from "@/app/lib/api/responses";
import { AccountService, visibleRolesFor } from "@/app/lib/auth/account-service";
import { requirePermission } from "@/app/lib/auth/session";
import { UserRepository, type UserWithRoles } from "@/app/repositories/user.repository";
import { PERMISSIONS } from "@/app/types/roles";
import {
  isGenericAccount,
  isInstitutionalEmailAllowed,
  ListUsersQuerySchema,
  UserInputSchema,
} from "@/app/types/user";

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
    const visibleRoles = visibleRolesFor(actor.roles);
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

const CreateUserBodySchema = UserInputSchema.superRefine((value, ctx) => {
  if (isGenericAccount(value.email)) {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "Contas genéricas não são permitidas",
    });
  }
  if (!isInstitutionalEmailAllowed(value.email)) {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "Use o e-mail institucional da faculdade",
    });
  }
});

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.USERS_CREATE);
    const body = CreateUserBodySchema.parse(await request.json());
    const result = await new AccountService().createUser(body, actorFrom(actor, request));

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
