import type { GeneratedLesson, ImprovementSuggestion, LessonVersion, TeachingEvent, TeachingEventType, TeachingSession, TimingChange } from './types';

function makeId(_prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createTeachingSession(input: { lessonId?: string; plannedDuration: number; cohort?: string; courseContext?: string; sessionDate?: string }): TeachingSession {
  const now = new Date().toISOString();
  return {
    id: makeId('session'), lessonId: input.lessonId, plannedDuration: input.plannedDuration,
    cohort: input.cohort || undefined, courseContext: input.courseContext || undefined,
    sessionDate: input.sessionDate || now.slice(0, 10), status: 'Started', startedAt: now,
    checkpointObservations: [], timingChanges: [], adaptationsUsed: [], difficultConcepts: [], events: [{ id: makeId('event'), type: 'session_started', label: 'Lesson started', occurredAt: now }], createdAt: now, updatedAt: now,
  };
}

export function appendTeachingEvent(session: TeachingSession, event: Omit<TeachingEvent, 'id' | 'occurredAt'> & { occurredAt?: string }): TeachingSession {
  const now = event.occurredAt || new Date().toISOString();
  const nextEvent: TeachingEvent = { ...event, id: makeId('event'), occurredAt: now };
  const timingChanges = event.phase && event.minutesDelta ? [...session.timingChanges, { phase: event.phase, minutesDelta: event.minutesDelta, reason: event.detail || event.label, occurredAt: now }] : session.timingChanges;
  const checkpoints = event.type === 'checkpoint' ? [...session.checkpointObservations, nextEvent] : session.checkpointObservations;
  const adaptations = event.type === 'adaptation' || event.type === 'diagnostic_used' || event.type === 'example_used' || event.type === 'activity_skipped' || event.type === 'discussion_extended' ? [...session.adaptationsUsed, event.label] : session.adaptationsUsed;
  return { ...session, status: session.status === 'Started' ? 'In Progress' : session.status, events: [...session.events, nextEvent], timingChanges, checkpointObservations: checkpoints, adaptationsUsed: Array.from(new Set(adaptations)), updatedAt: now };
}

export function completeTeachingSession(session: TeachingSession, actualDuration: number): TeachingSession {
  const now = new Date().toISOString();
  const completed = appendTeachingEvent({ ...session, status: 'Completed', actualDuration, completedAt: now }, { type: 'session_completed', label: 'Lesson completed', detail: `${actualDuration} minutes actual against ${session.plannedDuration} planned`, occurredAt: now });
  return { ...completed, status: 'Completed', actualDuration, completedAt: now, updatedAt: now };
}

export function plannedActualSummary(session: TeachingSession) {
  const actual = session.actualDuration ?? session.plannedDuration;
  const difference = actual - session.plannedDuration;
  const byPhase = session.timingChanges.reduce<Record<string, number>>((result, item) => { result[item.phase] = (result[item.phase] || 0) + item.minutesDelta; return result; }, {});
  return { planned: session.plannedDuration, actual, difference, byPhase };
}

export function buildRepeatedFriction(sessions: TeachingSession[]) {
  const counts = new Map<string, number>();
  sessions.forEach((session) => session.difficultConcepts.filter(Boolean).forEach((concept) => { const key = concept.trim().toLowerCase(); counts.set(key, (counts.get(key) || 0) + 1); }));
  return Array.from(counts.entries()).filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).map(([concept, count]) => ({ concept, count, label: `${concept} has been flagged as difficult in ${count} teaching sessions.`, possibleResponse: 'Add a diagnostic question and a worked example before independent practice.' }));
}

export function buildSuccessfulTeachingMoves(sessions: TeachingSession[]) {
  const counts = new Map<string, number>();
  sessions.forEach((session) => {
    session.adaptationsUsed.forEach((move) => { const key = move.trim(); if (key) counts.set(key, (counts.get(key) || 0) + 1); });
    const reflection = session.reflection;
    const usefulActivity = reflection?.mostUsefulActivity?.trim() || (reflection?.whatWorked?.trim() ? 'Lecturer-recorded successful activity' : '');
    if (usefulActivity) counts.set(usefulActivity, (counts.get(usefulActivity) || 0) + 1);
  });
  return Array.from(counts.entries()).filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).map(([move, count]) => ({ move, count, note: `Recorded as useful in ${count} teaching sessions. This is lecturer-recorded evidence, not a causal effectiveness claim.` }));
}

export function createLessonVersion(lessonId: string, content: GeneratedLesson, versionNumber: number, changeSummary: string, changeReason?: string): LessonVersion {
  return { id: makeId('version'), lessonId, versionNumber, content: { ...content, version: versionNumber }, changeSummary, changeReason, createdAt: new Date().toISOString() };
}

export function eventTypeForAdaptation(kind: string): TeachingEventType {
  if (kind === 'example') return 'example_used';
  if (kind === 'skip') return 'activity_skipped';
  if (kind === 'extend') return 'discussion_extended';
  if (kind === 'diagnostic') return 'diagnostic_used';
  return 'adaptation';
}

export function mergeImprovementHistory(current: ImprovementSuggestion[] = [], incoming: ImprovementSuggestion[] = []) {
  const map = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

export function formatSessionDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function totalTimingChange(changes: TimingChange[]) { return changes.reduce((sum, item) => sum + item.minutesDelta, 0); }
