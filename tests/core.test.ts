import { describe, expect, it } from 'vitest';
import { analyzeLesson, buildCourseArcIntelligence, buildLearningFriction, buildQuestionBank, getRhythm, rebalanceForStudentActivity, transformLesson } from '../lib/intelligence';
import { appendTeachingEvent, buildRepeatedFriction, buildSuccessfulTeachingMoves, completeTeachingSession, createLessonVersion, createTeachingSession, plannedActualSummary } from '../lib/teaching-memory';
import { arcOutputSchema, lessonOutputSchema, lessonRequestSchema } from '../lib/generation-schemas';
import type { GeneratedLesson, LessonRequest } from '../lib/types';

const request: LessonRequest = { subject: 'Data Science', topic: 'Classification', level: 'Undergraduate', durationMinutes: 60, objectives: 'Students explain classification and apply it to a defensible example.', priorKnowledge: 'Descriptive statistics', teachingStyle: 'Active seminar' };
const lesson: GeneratedLesson = {
  title: 'Classification', overview: 'A practical lesson.', learningObjectives: ['Explain classification', 'Apply classification to an example'],
  lessonSequence: [
    { minutes: 10, phase: 'Activate', teacherActions: ['Prompt recall'], studentActions: ['Discuss prior knowledge'] },
    { minutes: 25, phase: 'Build understanding', teacherActions: ['Model an example'], studentActions: ['Annotate the example'] },
    { minutes: 15, phase: 'Apply', teacherActions: ['Facilitate a task'], studentActions: ['Solve and justify'] },
    { minutes: 10, phase: 'Consolidate', teacherActions: ['Run an exit check'], studentActions: ['Summarize the idea'] },
  ],
  explanation: { plainLanguage: 'A clear explanation.', analogy: 'An analogy.', workedExample: 'A worked example.', misconception: 'A correction.' },
  activity: { title: 'Group task', instructions: ['Choose an example', 'Justify it'], materials: ['Board'], expectedOutcome: 'Visible reasoning.' },
  assessment: { questions: [{ question: 'What is classification?', answer: 'A category decision.', rationale: 'Checks understanding.' }], rubric: [{ criterion: 'Reasoning', excellent: 'Clear reasoning.', developing: 'Partial reasoning.' }] },
  homework: ['Write a short explanation'],
};

const arc = { title: 'Foundations', positioning: 'A coherent arc.', weeks: [{ week: 1, theme: 'Core concepts', outcome: 'Explain foundations', sessions: [{ title: 'Session 1', focus: 'Build understanding', activity: 'Paired task', check: 'Exit ticket' }] }, { week: 2, theme: 'Application', outcome: 'Apply foundations', sessions: [{ title: 'Session 2', focus: 'Apply', activity: 'Group task', check: 'One-minute response' }] }] };

describe('generation schemas', () => {
  it('accepts a valid request and rejects missing required fields', () => {
    expect(lessonRequestSchema.safeParse(request).success).toBe(true);
    expect(lessonRequestSchema.safeParse({ ...request, topic: '' }).success).toBe(false);
  });
  it('accepts valid generated structures and rejects unknown output fields', () => {
    expect(lessonOutputSchema.safeParse(lesson).success).toBe(true);
    expect(lessonOutputSchema.safeParse({ ...lesson, unexpected: true }).success).toBe(false);
    expect(arcOutputSchema.safeParse(arc).success).toBe(true);
  });
});

describe('lesson intelligence', () => {
  it('calculates rhythm and bounded quality analysis', () => {
    const rhythm = getRhythm(lesson); const analysis = analyzeLesson(lesson, request);
    expect(rhythm).toHaveLength(4); expect(rhythm.map((item) => item.minutes).reduce((a, b) => a + b, 0)).toBe(60); expect(analysis.score).toBeGreaterThanOrEqual(0); expect(analysis.score).toBeLessThanOrEqual(100);
  });
  it('rebalances timing without changing total duration and preserves objectives', () => {
    const next = rebalanceForStudentActivity(lesson);
    expect(next.lessonSequence.map((item) => item.minutes).reduce((a, b) => a + b, 0)).toBe(60);
    expect(next.learningObjectives).toEqual(lesson.learningObjectives);
  });
  it('preserves objectives when transforming teaching style and derives questions/friction', () => {
    const transformed = transformLesson(lesson, 'Problem-Based Learning');
    expect(transformed.learningObjectives).toEqual(lesson.learningObjectives);
    expect(buildQuestionBank(lesson).length).toBeGreaterThan(0);
    expect(buildLearningFriction(lesson, request).length).toBeGreaterThan(0);
  });
  it('calculates course-arc coherence and coverage signals', () => {
    const intelligence = buildCourseArcIntelligence(arc);
    expect(intelligence.coherence).toBeGreaterThanOrEqual(0); expect(intelligence.coherence).toBeLessThanOrEqual(100);
    expect(intelligence.checkCoverage).toBe(100);
  });
});

describe('teaching memory', () => {
  it('records adaptation evidence and planned versus actual duration', () => {
    const started = createTeachingSession({ lessonId: '11111111-1111-4111-8111-111111111111', plannedDuration: 60 });
    const adapted = appendTeachingEvent(started, { type: 'timing_change', label: 'Added practice', phase: 'Apply', minutesDelta: 5, detail: 'Added five minutes.' });
    const completed = completeTeachingSession(adapted, 65); const summary = plannedActualSummary(completed);
    expect(completed.events).toHaveLength(3); expect(completed.timingChanges).toHaveLength(1); expect(summary).toMatchObject({ planned: 60, actual: 65, difference: 5 });
  });
  it('surfaces repeated friction and successful moves without mutating sessions', () => {
    const first = completeTeachingSession({ ...createTeachingSession({ plannedDuration: 60 }), difficultConcepts: ['classification'], reflection: { whatWorked: 'Worked example', whereStruggled: '', discussion: '', reinforcement: '', timing: '', nextChange: '', understanding: 'Mixed', activityEngagement: 'High', lecturerConfidence: 'High', mostUsefulActivity: 'Worked example' } }, 60);
    const second = completeTeachingSession({ ...createTeachingSession({ plannedDuration: 60 }), difficultConcepts: ['classification'], reflection: { whatWorked: 'Worked example', whereStruggled: '', discussion: '', reinforcement: '', timing: '', nextChange: '', understanding: 'Strong understanding', activityEngagement: 'High', lecturerConfidence: 'High', mostUsefulActivity: 'Worked example' } }, 60);
    expect(buildRepeatedFriction([first, second])[0].concept).toBe('classification');
    expect(buildSuccessfulTeachingMoves([first, second])[0].move).toBe('Worked example');
  });
  it('creates a new version object with an incremented version number', () => {
    const version = createLessonVersion('11111111-1111-4111-8111-111111111111', lesson, 2, 'Added practice', 'Lecturer decision');
    expect(version.versionNumber).toBe(2); expect(version.content.title).toBe('Classification');
  });
});
