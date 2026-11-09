import { z } from "zod";
import type { DateString, DateTime, Email, InstitucionalEmail, PasswordHash } from "./common";
import { DateStringSchema, DateTimeSchema, EmailSchema } from "./common";

export type UserId = number;

export type UserInput = {
  email: Email;
  birthDate: DateString;
  emailVerifiedAt: DateTime;
};

export const UserInputSchema = z.object({
  email: EmailSchema,
  birthDate: DateStringSchema,
  emailVerifiedAt: DateTimeSchema,
});

export type UserDto = UserInput & {
  id: UserId;
  institucionalEmail: InstitucionalEmail;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type User = UserDto & {
  password_hash: PasswordHash;
};
