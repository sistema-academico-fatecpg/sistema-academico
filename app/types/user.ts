import {
  date,
  datetime,
  email,
  institucionalEmail,
  passwordHash,
} from "./common";

export type userId = number;

export type userInput = {
  email: email;
  birthDate: date;
  emailVerifiedAt: datetime;
}

export type userDto = userInput & {
  id: userId;
  institucionalEmail: institucionalEmail;
  createdAt: datetime;
  updatedAt: datetime;
}

export type user = userDto & {
  password_hash: passwordHash;
};
