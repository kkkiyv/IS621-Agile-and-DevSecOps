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
  caseId?: string | null;
}

export type CaseStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export type CaseOutcome = "ONGOING" | "RESOLVED" | "REFERRED_EXTERNALLY" | "NO_FURTHER_ACTIONS";

export type SessionType = "INDIVIDUAL" | "GROUP" | "FAMILY" | "CRISIS";

export interface SessionNote {
  id: string;
  caseId: string;
  sessionType: SessionType;
  sessionTypeLabel: string;
  duration: number;
  sessionDate: string;
  summary: string;
  observations: string;
  nextSteps: string;
  author: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface Case {
  id: string;
  status: CaseStatus;
  riskLevel?: RiskLevel | null;
  outcome?: CaseOutcome | null;
  outcomeNotes?: string | null;
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
  overdueTaskCount?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  dueDate: string;
  caseId: string;
  assignedToId: string;
  assignedTo?: { id: string; name: string };
  createdAt: string;
  isOverdue?: boolean;
}

export interface Note {
  id: string;
  content: string;
  caseId: string;
  authorId: string;
  author: { id: string; name: string };
  createdAt: string;
}

export interface QueueResponse {
  referrals: CounsellorReferral[];
  filter: { status: string } | null;
  statusCounts: Record<string, number>;
}

export type AuditAction =
  | "REFERRAL_CREATED"
  | "REFERRAL_TRIAGED"
  | "CASE_CREATED"
  | "NOTE_CREATED"
  | "TASK_CREATED"
  | "SESSION_NOTE_CREATED";

export interface DashboardMetrics {
  totalReferrals: number;
  activeCases: number;
  overdueTasks: number;
  openTasks: number;
}

export interface DashboardOverdueTask {
  id: string;
  title: string;
  studentName: string;
  assignedToName: string;
  caseId: string;
}

export interface DashboardRiskCase {
  id: string;
  studentName: string;
  assignedToName: string;
  riskLevel: RiskLevel;
  openTaskCount: number;
}

export interface DashboardSummary {
  metrics: DashboardMetrics;
  referralsByRisk: Record<RiskLevel, number>;
  casesByStatus: Record<CaseStatus, number>;
  overdueTasks: DashboardOverdueTask[];
  riskCases: DashboardRiskCase[];
  generatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actionLabel: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    role: Role;
    label: string;
  };
  details: string;
  recordId: string;
  recordType: string;
  displayRecordId: string;
}
