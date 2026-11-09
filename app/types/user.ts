import type { DateString, DateTime, Email, InstitucionalEmail, PasswordHash } from "./common";

export type UserId = number;

export type UserInput = {
  email: Email;
  birthDate: DateString;
  emailVerifiedAt: DateTime;
};

export type UserDto = UserInput & {
  id: UserId;
  institucionalEmail: InstitucionalEmail;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type User = UserDto & {
  password_hash: PasswordHash;
};
