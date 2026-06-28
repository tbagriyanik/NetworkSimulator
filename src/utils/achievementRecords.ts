'use client';

interface SummaryProject {
  name: string;
  lastDate: string;
}

interface SummaryGuidedLesson {
  name: string;
  points: number;
  totalPoints: number;
  completedAt: string;
}

interface SummaryExam {
  name: string;
  score: number;
  maxScore: number;
  completedAt: string;
}

export interface AchievementSummary {
  totalSessionSeconds: number;
  projects: SummaryProject[];
  guidedLessons: SummaryGuidedLesson[];
  exams: SummaryExam[];
}

const STORAGE_KEY = 'netsim_achievement_summary';

export function getSummary(): AchievementSummary {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { totalSessionSeconds: 0, projects: [], guidedLessons: [], exams: [] };
  } catch {
    return { totalSessionSeconds: 0, projects: [], guidedLessons: [], exams: [] };
  }
}

function saveSummary(summary: AchievementSummary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
  } catch {
    // storage error
  }
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('basarilarim-updated'));
    }
  } catch {
    // event dispatch error - non-critical
  }
}

export function addSessionDuration(seconds: number): void {
  const summary = getSummary();
  summary.totalSessionSeconds += seconds;
  saveSummary(summary);
}

export function addProjectRecord(name: string): void {
  const summary = getSummary();
  const existing = summary.projects.find(p => p.name === name);
  if (existing) {
    existing.lastDate = new Date().toISOString();
  } else {
    summary.projects.push({ name, lastDate: new Date().toISOString() });
  }
  saveSummary(summary);
}

export function addGuidedLessonRecord(name: string, points: number, totalPoints: number): void {
  const summary = getSummary();
  const existing = summary.guidedLessons.find(l => l.name === name);
  if (existing) {
    if (points > existing.points) {
      existing.points = points;
      existing.totalPoints = totalPoints;
      existing.completedAt = new Date().toISOString();
    }
  } else {
    summary.guidedLessons.push({ name, points, totalPoints, completedAt: new Date().toISOString() });
  }
  saveSummary(summary);
}

export function addExamRecord(name: string, score: number, maxScore: number): void {
  const summary = getSummary();
  const existing = summary.exams.find(e => e.name === name);
  if (existing) {
    if (score > existing.score) {
      existing.score = score;
      existing.maxScore = maxScore;
      existing.completedAt = new Date().toISOString();
    }
  } else {
    summary.exams.push({ name, score, maxScore, completedAt: new Date().toISOString() });
  }
  saveSummary(summary);
}

export function clearSummary(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage error
  }
}
