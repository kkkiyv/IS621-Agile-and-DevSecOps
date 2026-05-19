import type { Role, User } from "../types";

export function getHomePath(role: Role): string {
  if (role === "TEACHER") return "/teacher/referrals";
  if (role === "LEAD_ADMIN") return "/lead";
  return "/counsellor/queue";
}

export function redirectAfterLogin(user: User): string {
  return getHomePath(user.role);
}
