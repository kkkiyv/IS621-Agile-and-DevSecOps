export type Role = "TEACHER" | "COUNSELLOR" | "LEAD_ADMIN";

export type ReferralStatus =
  | "SUBMITTED"
  | "IN_REVIEW"
  | "CASE_OPENED"
  | "CLOSED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  expiresInHours: number;
  user: User;
}

export interface TeacherReferral {
  id: string;
  studentName: string;
  concern: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface CounsellorReferral {
  id: string;
  studentName: string;
  concern: string;
  description: string;
  status: ReferralStatus;
  statusLabel: string;
  riskLevel?: RiskLevel | null;
  riskLevelLabel?: string | null;
  triageNotes?: string | null;
  triagedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  submittedBy?: { id: string; email: string; name: string };
  triagedBy?: { id: string; name: string };
}

export type CaseStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export interface Case {
  id: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  referral: {
    id: string;
    studentName: string;
    concern: string;
    riskLevel?: RiskLevel | null;
    triageNotes?: string | null;
  };
  assignedTo: { id: string; name: string; email: string };
}

export interface QueueResponse {
  referrals: CounsellorReferral[];
  filter: { status: string } | null;
  statusCounts: Record<string, number>;
}
