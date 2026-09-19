export type LessonRequest = {
  subject: string;
  topic: string;
  level: string;
  durationMinutes: number;
  objectives: string;
  priorKnowledge: string;
  teachingStyle: string;
};

export type LessonReflection = {
  whatWorked: string;
  whereStruggled: string;
  discussion: string;
  reinforcement: string;
  timing: string;
  nextChange: string;
  understanding?: 'Needs reinforcement' | 'Mixed' | 'Mostly understood' | 'Strong understanding';
  timingObservation?: 'Finished early' | 'On time' | 'Ran over';
  activityEngagement?: 'Low' | 'Moderate' | 'High';
  difficultConcept?: string;
  lecturerConfidence?: string;
  mostUsefulActivity?: string;
  savedAt?: string;
};

export type LearningFriction = {
  id: string;
  concept: string;
  reason: string;
  evidence: string;
  move: string;
  target: string;
  severity: 'low' | 'medium' | 'high';
};

export type FrictionIntervention = {
  title: string;
  before: string;
  after: string;
  purpose: string;
  target: string;
};

export type QuestionCategory = 'Diagnostic' | 'Recall' | 'Understanding' | 'Application' | 'Analysis' | 'Evaluation' | 'Discussion' | 'Exit Ticket' | 'Exam Practice';
export type QuestionDifficulty = 'Foundation' | 'Core' | 'Stretch';

export type LessonQuestion = {
  id: string;
  category: QuestionCategory;
  question: string;
  purpose: string;
  difficulty: QuestionDifficulty;
  answer: string;
  rationale: string;
  objective: string;
  source: 'lesson' | 'derived';
};

export type ExampleLadder = {
  concept: string;
  levels: { level: number; label: string; example: string; teachingMove: string }[];
};

export type AnalogyQuality = {
  analogy: string;
  whatItExplains: string;
  whereItBreaks: string;
  alternative: string;
};

export type AccessibilitySuggestion = {
  id: string;
  label: string;
  reason: string;
  evidence: string;
  before: string;
  after: string;
  target: string;
};

export type LearnerPath = {
  name: 'Foundation' | 'Standard' | 'Challenge';
  description: string;
  changes: string[];
  activity: string;
  question: string;
  extension: string;
};

export type ImprovementSuggestion = {
  id: string;
  problem: string;
  evidence: string;
  change: string;
  purpose: string;
  target: string;
  before: string;
  after: string;
  status: 'proposed' | 'accepted' | 'rejected';
};

export type GeneratedLesson = {
  title: string;
  overview: string;
  learningObjectives: string[];
  lessonSequence: { minutes: number; phase: string; teacherActions: string[]; studentActions: string[] }[];
  explanation: { plainLanguage: string; analogy: string; workedExample: string; misconception: string };
  activity: { title: string; instructions: string[]; materials: string[]; expectedOutcome: string };
  assessment: { questions: { question: string; answer: string; rationale: string }[]; rubric: { criterion: string; excellent: string; developing: string }[] };
  homework: string[];
  adaptationNote?: string;
  reflection?: LessonReflection;
  status?: LessonStatus;
  version?: number;
  learningFriction?: LearningFriction[];
  questionBank?: LessonQuestion[];
  exampleLadder?: ExampleLadder;
  analogyQuality?: AnalogyQuality;
  accessibilitySuggestions?: AccessibilitySuggestion[];
  learnerPaths?: LearnerPath[];
  improvementSuggestions?: ImprovementSuggestion[];
};

export type TeachingSessionStatus = 'Planned' | 'Started' | 'In Progress' | 'Completed';
export type LessonStatus = 'Draft' | 'Ready' | 'Taught' | 'Needs Revision' | 'Archived';

export type TeachingEventType = 'session_started' | 'checkpoint' | 'timing_change' | 'adaptation' | 'diagnostic_used' | 'example_used' | 'activity_skipped' | 'discussion_extended' | 'session_completed' | 'reflection_saved';

export type TeachingEvent = {
  id: string;
  type: TeachingEventType;
  label: string;
  detail?: string;
  phase?: string;
  minutesDelta?: number;
  occurredAt: string;
};

export type TimingChange = {
  phase: string;
  minutesDelta: number;
  reason: string;
  occurredAt: string;
};

export type TeachingSession = {
  id: string;
  lessonId?: string;
  userId?: string;
  courseContext?: string;
  cohort?: string;
  plannedDuration: number;
  actualDuration?: number;
  sessionDate: string;
  startedAt?: string;
  completedAt?: string;
  status: TeachingSessionStatus;
  checkpointObservations: TeachingEvent[];
  timingChanges: TimingChange[];
  adaptationsUsed: string[];
  difficultConcepts: string[];
  activityEngagement?: 'Low' | 'Moderate' | 'High';
  understandingObservation?: 'Needs reinforcement' | 'Mixed' | 'Mostly understood' | 'Strong understanding';
  lecturerConfidence?: string;
  reflection?: LessonReflection;
  improvementSuggestions?: ImprovementSuggestion[];
  events: TeachingEvent[];
  createdAt: string;
  updatedAt: string;
};

export type LessonVersion = {
  id: string;
  lessonId: string;
  versionNumber: number;
  content: GeneratedLesson;
  changeSummary: string;
  changeReason?: string;
  createdAt: string;
};

export type TeachingHistoryItem = {
  session: TeachingSession;
  lessonTitle: string;
};

export type CourseCoverageSignal = {
  outcome: string;
  week?: number;
  lessonTitle?: string;
  activity?: string;
  assessment?: string;
  teachingSessionCount: number;
  status: 'Covered' | 'Partially covered' | 'Not yet covered';
};

export type CourseContinuitySuggestion = {
  previousLesson?: string;
  nextLesson: string;
  suggestion: string;
  rationale: string;
};

export type CourseArcRequest = {
  courseTitle: string;
  subject: string;
  weeks: number;
  sessionsPerWeek: number;
  cohort: string;
  finalOutcome: string;
};

export type CourseArc = {
  title: string;
  positioning: string;
  weeks: { week: number; theme: string; outcome: string; sessions: { title: string; focus: string; activity: string; check: string }[] }[];
};
