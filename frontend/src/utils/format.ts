export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export const CONCERN_CATEGORIES = [
  "Academic performance",
  "Behavioral concerns",
  "Attendance issues",
  "Social/emotional wellbeing",
  "Family/home situation",
  "Health concerns",
  "Other",
] as const;

export function caseOwnerRoleLabel(role: "COUNSELLOR" | "LEAD_ADMIN"): string {
  return role === "LEAD_ADMIN" ? "Lead" : "Counsellor";
}
