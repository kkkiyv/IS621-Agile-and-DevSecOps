export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export const CONCERN_CATEGORIES = [
  "Behavioral concerns",
  "Academic performance",
  "Attendance",
  "Wellbeing",
  "Safeguarding",
  "Other",
] as const;
