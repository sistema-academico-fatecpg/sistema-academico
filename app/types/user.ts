import { z } from "zod";
import type { DateString, DateTime, Email, InstitucionalEmail, RoleName, UserId } from "./common";
import {
  DateStringSchema,
  DateTimeSchema,
  EmailSchema,
  InstitucionalEmailSchema,
  RoleNameSchema,
  UserIdSchema,
} from "./common";

export type UserInput = {
  email: Email;
  birthDate: DateString;
  emailVerifiedAt: DateTime;
  role: RoleName;
};

export const UserInputSchema = z.object({
  email: EmailSchema,
  birthDate: DateStringSchema,
  emailVerifiedAt: DateTimeSchema,
  role: RoleNameSchema,
});

export type UserDto = UserInput & {
  id: UserId;
  institucionalEmail: InstitucionalEmail;
  createdAt: DateTime;
  updatedAt: DateTime;
  status: "ACTIVE" | "BLOCKED";
  role: RoleName;
};

export type User = UserDto;

export const UserSchema = z.object({
  id: UserIdSchema,
  email: EmailSchema,
  institutional_email: InstitucionalEmailSchema,
  birth_date: DateStringSchema,
  email_verified_at: DateTimeSchema.nullable(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
  role_id: UserIdSchema,
  status: z.enum(["ACTIVE", "BLOCKED"]),
});
