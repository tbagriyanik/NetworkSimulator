export interface StudentProgress {
  studentId: string;
  displayName: string;
  currentTask: string;
  completedTasks: number;
  totalTasks: number;
  joinedAt: number;
  lastSeen: number;
  projectFile?: string;
  durationMinutes?: number;
}

export interface RoomData {
  code: string;
  createdAt: number;
  teacherId: string;
  students: Record<string, StudentProgress>;
}

export interface RoomMeta {
  code: string;
  createdAt: number;
  teacherId: string;
}

export interface RoomApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface CertificateRecord {
  verifyCode: string;
  studentName: string;
  projectTitle: string;
  score: number;
  totalScore: number;
  date: string;
  language: 'tr' | 'en';
  issuedAt: number;
}
