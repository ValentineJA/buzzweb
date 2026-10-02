import type { Profile } from "../profile-data";
export type Role = "member" | "admin" | "subadmin";
export type Account = { uid: string; email: string; role: Role; profile: Profile; isTestAccount: boolean };
export type UserDocument = {
  _id: string;
  email: string;
  birthDate: string;
  adultConfirmedAt: Date;
  role: Role;
  profile: Profile;
  handle: string;
  isTestAccount: boolean;
  disabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
};
export function publicAccount(user: UserDocument): Account {
  return { uid: user._id, email: user.email, role: user.role, profile: user.profile, isTestAccount: user.isTestAccount };
}