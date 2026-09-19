import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);

export const lessonRequestSchema = z.object({
  subject: z.string().trim().min(2).max(120),
  topic: z.string().trim().min(2).max(200),
  level: z.string().trim().min(2).max(120),
  durationMinutes: z.number().int().min(10).max(480),
  objectives: z.string().trim().min(10).max(2000),
  priorKnowledge: z.string().trim().min(2).max(1000),
  teachingStyle: z.string().trim().min(2).max(120),
});

const sequenceItemSchema = z.object({
  minutes: z.number().int().min(1).max(480),
  phase: nonEmpty,
  teacherActions: z.array(nonEmpty).min(1).max(12),
  studentActions: z.array(nonEmpty).min(1).max(12),
}).strict();

const explanationSchema = z.object({
  plainLanguage: nonEmpty,
  analogy: nonEmpty,
  workedExample: nonEmpty,
  misconception: nonEmpty,
}).strict();

const activitySchema = z.object({
  title: nonEmpty,
  instructions: z.array(nonEmpty).min(1).max(20),
  materials: z.array(nonEmpty).max(20),
  expectedOutcome: nonEmpty,
}).strict();

const assessmentQuestionSchema = z.object({
  question: nonEmpty,
  answer: nonEmpty,
  rationale: nonEmpty,
}).strict();

const rubricSchema = z.object({
  criterion: nonEmpty,
  excellent: nonEmpty,
  developing: nonEmpty,
}).strict();

export const lessonOutputSchema = z.object({
  title: nonEmpty,
  overview: nonEmpty,
  learningObjectives: z.array(nonEmpty).min(1).max(20),
  lessonSequence: z.array(sequenceItemSchema).min(1).max(20),
  explanation: explanationSchema,
  activity: activitySchema,
  assessment: z.object({
    questions: z.array(assessmentQuestionSchema).min(1).max(20),
    rubric: z.array(rubricSchema).min(1).max(20),
  }).strict(),
  homework: z.array(nonEmpty).max(20),
}).strict();

export const courseArcRequestSchema = z.object({
  courseTitle: z.string().trim().min(2).max(160),
  subject: z.string().trim().min(2).max(120),
  weeks: z.number().int().min(2).max(12),
  sessionsPerWeek: z.number().int().min(1).max(4),
  cohort: z.string().trim().min(2).max(160),
  finalOutcome: z.string().trim().min(10).max(2000),
});

const arcSessionSchema = z.object({
  title: nonEmpty,
  focus: nonEmpty,
  activity: nonEmpty,
  check: nonEmpty,
}).strict();

export const arcOutputSchema = z.object({
  title: nonEmpty,
  positioning: nonEmpty,
  weeks: z.array(z.object({
    week: z.number().int().min(1).max(52),
    theme: nonEmpty,
    outcome: nonEmpty,
    sessions: z.array(arcSessionSchema).min(1).max(8),
  }).strict()).min(1).max(12),
}).strict();

export const lessonJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'overview', 'learningObjectives', 'lessonSequence', 'explanation', 'activity', 'assessment', 'homework'],
  properties: {
    title: { type: 'string' }, overview: { type: 'string' },
    learningObjectives: { type: 'array', items: { type: 'string' } },
    lessonSequence: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['minutes', 'phase', 'teacherActions', 'studentActions'], properties: { minutes: { type: 'integer' }, phase: { type: 'string' }, teacherActions: { type: 'array', items: { type: 'string' } }, studentActions: { type: 'array', items: { type: 'string' } } } } },
    explanation: { type: 'object', additionalProperties: false, required: ['plainLanguage', 'analogy', 'workedExample', 'misconception'], properties: { plainLanguage: { type: 'string' }, analogy: { type: 'string' }, workedExample: { type: 'string' }, misconception: { type: 'string' } } },
    activity: { type: 'object', additionalProperties: false, required: ['title', 'instructions', 'materials', 'expectedOutcome'], properties: { title: { type: 'string' }, instructions: { type: 'array', items: { type: 'string' } }, materials: { type: 'array', items: { type: 'string' } }, expectedOutcome: { type: 'string' } } },
    assessment: { type: 'object', additionalProperties: false, required: ['questions', 'rubric'], properties: { questions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['question', 'answer', 'rationale'], properties: { question: { type: 'string' }, answer: { type: 'string' }, rationale: { type: 'string' } } } }, rubric: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['criterion', 'excellent', 'developing'], properties: { criterion: { type: 'string' }, excellent: { type: 'string' }, developing: { type: 'string' } } } } } },
    homework: { type: 'array', items: { type: 'string' } },
  },
};

export const arcJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'positioning', 'weeks'],
  properties: {
    title: { type: 'string' }, positioning: { type: 'string' },
    weeks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['week', 'theme', 'outcome', 'sessions'], properties: { week: { type: 'integer' }, theme: { type: 'string' }, outcome: { type: 'string' }, sessions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'focus', 'activity', 'check'], properties: { title: { type: 'string' }, focus: { type: 'string' }, activity: { type: 'string' }, check: { type: 'string' } } } } } } },
  },
};
