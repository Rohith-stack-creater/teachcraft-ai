import type { AccessibilitySuggestion, AnalogyQuality, ExampleLadder, GeneratedLesson, ImprovementSuggestion, LearnerPath, LessonQuestion, LessonReflection, LessonRequest, LearningFriction, QuestionCategory, QuestionDifficulty } from './types';

export type QualityMetric = {
  label: string;
  score: number;
  weight: number;
  detail: string;
};

export type LessonIssue = {
  id: string;
  label: string;
  message: string;
  target: string;
};

export type AlignmentRow = {
  objective: string;
  phase: string;
  activity: string;
  assessment: string;
  criterion: string;
  covered: boolean;
  note: string;
};

export type RhythmMode = 'teacher' | 'student' | 'discussion' | 'practice' | 'assessment' | 'reflection';

export type RhythmPhase = {
  phase: string;
  minutes: number;
  mode: RhythmMode;
  modeLabel: string;
};

export type QualityAnalysis = {
  score: number;
  metrics: QualityMetric[];
  strengths: string[];
  attention: string[];
  issues: LessonIssue[];
  alignment: AlignmentRow[];
  rhythm: RhythmPhase[];
};

export const teachingStyles = [
  'Traditional Lecture',
  'Active Seminar',
  'Flipped Classroom',
  'Studio Workshop',
  'Problem-Based Learning',
  'Case-Based Learning',
  'Socratic Seminar',
  'Project-Based Session',
  'Exam Revision',
  'Tutorial',
] as const;

export type TeachingStyle = (typeof teachingStyles)[number];

const stopWords = new Set(['about', 'after', 'also', 'because', 'could', 'from', 'into', 'learners', 'students', 'that', 'their', 'this', 'with', 'should', 'will']);

function words(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 3 && !stopWords.has(word));
}

function overlap(left: string, right: string) {
  const rightWords = new Set(words(right));
  return words(left).some((word) => rightWords.has(word));
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function classifyPhase(phase: GeneratedLesson['lessonSequence'][number]): RhythmMode {
  const text = `${phase.phase} ${phase.teacherActions.join(' ')} ${phase.studentActions.join(' ')}`.toLowerCase();
  if (/assess|check|exit|quiz|test/.test(text)) return 'assessment';
  if (/reflect|reflection|consolidat|summar|close|exit ticket/.test(text)) return 'reflection';
  if (/practice|apply|solve|workshop|task|exercise|problem/.test(text)) return 'practice';
  if (/discuss|debate|pair|group|dialogue|question/.test(text)) return 'discussion';
  if (phase.studentActions.length > phase.teacherActions.length || /student|learner|peer/.test(text)) return 'student';
  return 'teacher';
}

function modeLabel(mode: RhythmMode) {
  return ({ teacher: 'Teacher-led', student: 'Student-led', discussion: 'Discussion', practice: 'Practice', assessment: 'Assessment', reflection: 'Reflection' })[mode];
}

export function getRhythm(lesson: GeneratedLesson): RhythmPhase[] {
  return lesson.lessonSequence.map((phase) => {
    const mode = classifyPhase(phase);
    return { phase: phase.phase, minutes: phase.minutes, mode, modeLabel: modeLabel(mode) };
  });
}

export function analyzeLesson(lesson: GeneratedLesson, request: LessonRequest): QualityAnalysis {
  const sequenceMinutes = lesson.lessonSequence.reduce((sum, phase) => sum + phase.minutes, 0);
  const objectiveCount = lesson.learningObjectives.length;
  const questions = lesson.assessment.questions;
  const rubric = lesson.assessment.rubric;
  const rhythm = getRhythm(lesson);
  const teacherMinutes = rhythm.filter((item) => item.mode === 'teacher').reduce((sum, item) => sum + item.minutes, 0);
  const studentMinutes = rhythm.filter((item) => ['student', 'discussion', 'practice'].includes(item.mode)).reduce((sum, item) => sum + item.minutes, 0);
  const clarity = objectiveCount > 0 ? clamp(lesson.learningObjectives.reduce((sum, objective) => sum + (objective.length >= 25 && /\b(explain|apply|compare|identify|analyze|evaluate|create|describe|design|solve|demonstrate)\b/i.test(objective) ? 100 : objective.length >= 15 ? 75 : 45), 0) / objectiveCount) : 0;
  const activityAlignment = lesson.activity.instructions.length >= 3 && lesson.activity.expectedOutcome.length >= 25 ? 92 : lesson.activity.instructions.length ? 68 : 25;
  const assessmentAlignment = objectiveCount ? clamp((questions.length / objectiveCount) * 75 + (rubric.length >= objectiveCount ? 25 : 0)) : 0;
  const timeFeasibility = sequenceMinutes === request.durationMinutes ? 100 : Math.abs(sequenceMinutes - request.durationMinutes) <= 2 ? 85 : Math.max(35, 100 - Math.abs(sequenceMinutes - request.durationMinutes) * 4);
  const progression = lesson.lessonSequence.length >= 4 && rhythm.some((item) => item.mode === 'practice') && rhythm.some((item) => item.mode === 'assessment' || item.mode === 'reflection') ? 94 : lesson.lessonSequence.length >= 3 ? 72 : 45;
  const engagement = studentMinutes >= request.durationMinutes * 0.35 && lesson.activity.instructions.length >= 3 ? 94 : studentMinutes >= request.durationMinutes * 0.2 ? 72 : 48;
  const assessmentCoverage = questions.length >= Math.max(2, objectiveCount) && rubric.length >= 2 ? 96 : questions.length >= 1 ? 68 : 30;
  const accessibility = lesson.explanation.plainLanguage.length >= 40 && lesson.explanation.analogy.length >= 30 && lesson.activity.instructions.length >= 3 ? 90 : 65;
  const workload = rhythm.length > 0 && Math.max(...rhythm.map((item) => item.minutes)) <= request.durationMinutes * 0.55 ? 92 : 62;
  const transitions = lesson.lessonSequence.every((phase) => phase.teacherActions.length > 0 && phase.studentActions.length > 0) ? 92 : 58;
  const prerequisite = request.priorKnowledge.trim().length >= 12 ? 94 : request.priorKnowledge.trim().length >= 2 ? 68 : 30;
  const metrics: QualityMetric[] = [
    { label: 'Objective clarity', score: clarity, weight: 10, detail: clarity >= 80 ? 'Objectives use observable actions and give learners a clear destination.' : 'At least one objective would benefit from a more observable action verb.' },
    { label: 'Objective → activity alignment', score: activityAlignment, weight: 10, detail: activityAlignment >= 80 ? 'The activity has a visible outcome and enough steps to practise the brief.' : 'The activity needs a clearer learner outcome or more explicit steps.' },
    { label: 'Objective → assessment alignment', score: assessmentAlignment, weight: 10, detail: assessmentAlignment >= 80 ? 'Questions and success criteria provide coverage across the objectives.' : 'Some objectives have limited direct assessment coverage.' },
    { label: 'Time feasibility', score: timeFeasibility, weight: 10, detail: timeFeasibility >= 90 ? `The sequence totals ${sequenceMinutes} minutes, matching the brief.` : `The sequence totals ${sequenceMinutes} minutes against a ${request.durationMinutes}-minute brief.` },
    { label: 'Cognitive progression', score: progression, weight: 9, detail: progression >= 80 ? 'The lesson moves from activation through explanation, practice, and consolidation.' : 'The sequence needs a clearer move from understanding to independent application.' },
    { label: 'Student engagement', score: engagement, weight: 10, detail: engagement >= 80 ? `Approximately ${studentMinutes} minutes are student-led, discussion, or practice time.` : `Only approximately ${studentMinutes} minutes are visibly student-led or practice-focused.` },
    { label: 'Assessment coverage', score: assessmentCoverage, weight: 9, detail: assessmentCoverage >= 80 ? 'The lesson contains checks and criteria that can support formative judgement.' : 'Add more checks or criteria before treating the lesson as ready.' },
    { label: 'Accessibility', score: accessibility, weight: 8, detail: accessibility >= 80 ? 'Plain language, analogy, and stepwise instructions are present.' : 'Simplify instructions and provide more than one way for learners to participate.' },
    { label: 'Workload balance', score: workload, weight: 7, detail: workload >= 80 ? 'No single phase dominates the planned time.' : 'One phase takes a disproportionate share of the available time.' },
    { label: 'Transition quality', score: transitions, weight: 7, detail: transitions >= 80 ? 'Each phase names both teacher and learner movement.' : 'At least one phase needs a clearer handoff between teacher and learners.' },
    { label: 'Prerequisite coverage', score: prerequisite, weight: 10, detail: prerequisite >= 80 ? 'Prior knowledge is explicit enough to guide the opening move.' : 'Clarify the prior knowledge assumption or add a retrieval bridge.' },
  ];
  const totalWeight = metrics.reduce((sum, item) => sum + item.weight, 0);
  const score = Math.round(metrics.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight);
  const strengths = metrics.filter((item) => item.score >= 85).sort((a, b) => b.score - a.score).slice(0, 4).map((item) => item.detail);
  const attention = metrics.filter((item) => item.score < 80).sort((a, b) => a.score - b.score).slice(0, 4).map((item) => item.detail);
  const alignment = lesson.learningObjectives.map((objective, index) => {
    const phase = lesson.lessonSequence[index % Math.max(lesson.lessonSequence.length, 1)];
    const question = questions[index];
    const criterion = rubric[index];
    const activityCovered = Boolean(lesson.activity.instructions.length && (overlap(objective, lesson.activity.expectedOutcome) || lesson.activity.expectedOutcome.length > 20));
    const assessmentCovered = Boolean(question && (overlap(objective, question.question) || questions.length >= objectiveCount));
    const criterionCovered = Boolean(criterion);
    const covered = activityCovered && assessmentCovered && criterionCovered;
    return { objective, phase: phase?.phase || 'Unassigned', activity: activityCovered ? lesson.activity.title : 'Uncovered', assessment: assessmentCovered ? `Q${index + 1}: ${question.question}` : 'Uncovered', criterion: criterionCovered ? criterion.criterion : 'Uncovered', covered, note: covered ? 'Covered across the lesson design.' : 'Add a direct activity, check, or success criterion for this objective.' };
  });
  const issues: LessonIssue[] = [];
  if (timeFeasibility < 90) issues.push({ id: 'time', label: 'Time feasibility', message: `The sequence totals ${sequenceMinutes} minutes, not the planned ${request.durationMinutes}.`, target: 'lesson-sequence' });
  alignment.forEach((row, index) => { if (!row.covered) issues.push({ id: `alignment-${index}`, label: `Objective ${index + 1} coverage`, message: `“${row.objective}” is not fully connected to an assessment or criterion.`, target: 'alignment-map' }); });
  if (engagement < 80) issues.push({ id: 'engagement', label: 'Student activity', message: 'The lesson is weighted toward explanation rather than visible learner practice.', target: 'rhythm-visualizer' });
  if (accessibility < 80) issues.push({ id: 'accessibility', label: 'Accessibility', message: 'Instructions or explanations could offer clearer, lower-load entry points.', target: 'accessibility-adapter' });
  if (prerequisite < 80) issues.push({ id: 'prerequisites', label: 'Prerequisites', message: 'The opening needs a more explicit retrieval or prerequisite bridge.', target: 'lesson-brief' });
  return { score, metrics, strengths, attention, issues, alignment, rhythm };
}

export function rebalanceForStudentActivity(lesson: GeneratedLesson): GeneratedLesson {
  if (lesson.lessonSequence.length < 2) return lesson;
  const rhythm = getRhythm(lesson);
  const donorIndex = rhythm.reduce((best, item, index) => item.mode === 'teacher' && item.minutes > rhythm[best].minutes ? index : best, 0);
  const receiverIndex = rhythm.findIndex((item) => ['practice', 'student', 'discussion'].includes(item.mode));
  const targetIndex = receiverIndex >= 0 && receiverIndex !== donorIndex ? receiverIndex : Math.min(lesson.lessonSequence.length - 1, donorIndex + 1);
  const shift = Math.min(5, Math.max(1, Math.floor(lesson.lessonSequence[donorIndex].minutes * 0.2)), Math.max(0, lesson.lessonSequence[donorIndex].minutes - 2));
  if (!shift || donorIndex === targetIndex) return lesson;
  const sequence = lesson.lessonSequence.map((phase, index) => index === donorIndex ? { ...phase, minutes: phase.minutes - shift, teacherActions: [...phase.teacherActions, 'Keep the explanation concise and check understanding before moving on.'] } : index === targetIndex ? { ...phase, minutes: phase.minutes + shift, studentActions: [...phase.studentActions, 'Use the additional time to practise, compare reasoning, and revise the response.'] } : phase);
  return { ...lesson, lessonSequence: sequence, adaptationNote: `Rebalanced ${shift} minutes from ${lesson.lessonSequence[donorIndex].phase} into ${lesson.lessonSequence[targetIndex].phase} for more student activity.` };
}

function withActions(lesson: GeneratedLesson, teacherActions: string[], studentActions: string[], activity: GeneratedLesson['activity'], homework = lesson.homework): GeneratedLesson {
  return { ...lesson, lessonSequence: lesson.lessonSequence.map((phase, index) => index === 0 ? { ...phase, teacherActions } : index === Math.min(lesson.lessonSequence.length - 1, 2) ? { ...phase, teacherActions: [...phase.teacherActions, teacherActions[0]], studentActions } : phase), activity, homework };
}

export function transformLesson(lesson: GeneratedLesson, style: TeachingStyle): GeneratedLesson {
  const baseActivity = lesson.activity;
  const variants: Record<TeachingStyle, { teacher: string[]; students: string[]; activity: GeneratedLesson['activity']; homework?: string[] }> = {
    'Traditional Lecture': { teacher: ['Use a clear explanatory arc with worked examples and brief retrieval checks.'], students: ['Annotate the explanation, record key terms, and answer short checks individually.'], activity: { ...baseActivity, title: 'Guided lecture checks', instructions: ['Pause after each key idea.', 'Ask learners to write a one-sentence summary.', 'Reveal the worked example step by step.', 'Collect one remaining question before consolidation.'] } },
    'Active Seminar': { teacher: ['Open with a provocative question and facilitate comparison between learner explanations.'], students: ['Make a prediction, discuss it with a partner, and defend the group reasoning.'], activity: { ...baseActivity, title: 'Active seminar: compare and defend', instructions: ['Make an individual prediction.', 'Compare reasoning in groups of three.', 'Challenge one assumption in another group’s explanation.', 'Revise the answer using evidence from the lesson.'] } },
    'Flipped Classroom': { teacher: ['Use class time for retrieval, coaching, and targeted clarification rather than first exposure.'], students: ['Bring a short pre-class explanation, identify uncertainty, and apply the concept in class.'], activity: { ...baseActivity, title: 'Flipped application studio', instructions: ['Complete a short pre-class reading or viewing.', 'Begin with a retrieval check.', 'Use class time to solve the scenario in pairs.', 'Submit one question that still needs clarification.'] }, homework: ['Complete the short preparation before class.', 'Write a 150-word explanation of the concept and one uncertainty to bring to class.'] },
    'Studio Workshop': { teacher: ['Model the quality bar, then circulate while learners build and revise an artefact.'], students: ['Create a response, test it against the criteria, and improve it through peer feedback.'], activity: { ...baseActivity, title: 'Studio build and critique', instructions: ['Create a first version of the response.', 'Compare it with the success criteria.', 'Exchange work for structured peer feedback.', 'Revise and explain one design decision.'] } },
    'Problem-Based Learning': { teacher: ['Introduce an authentic problem and coach inquiry without giving away the solution path.'], students: ['Define what is known, identify what must be learned, and propose a defensible solution.'], activity: { ...baseActivity, title: 'Problem-based investigation', instructions: ['Define the problem and separate facts from assumptions.', 'List what the group needs to learn.', 'Develop and test a provisional solution.', 'Present the reasoning and identify the next question.'] } },
    'Case-Based Learning': { teacher: ['Use a realistic case and press learners to connect evidence with a decision.'], students: ['Interpret the case, weigh alternatives, and justify a recommendation.'], activity: { ...baseActivity, title: 'Case analysis and recommendation', instructions: ['Read the short case and highlight decision-relevant evidence.', 'Compare at least two possible responses.', 'Choose a recommendation and state the trade-off.', 'Defend the recommendation to another group.'] } },
    'Socratic Seminar': { teacher: ['Use layered questions and resist closing the discussion too quickly.'], students: ['Build on, question, and refine one another’s reasoning using precise language.'], activity: { ...baseActivity, title: 'Socratic inquiry circle', instructions: ['Prepare one claim and one genuine question.', 'Respond to a peer by extending or challenging the reasoning.', 'Track which evidence changes your view.', 'Close with a revised claim.'] } },
    'Project-Based Session': { teacher: ['Connect the concept to a meaningful deliverable and make milestones visible.'], students: ['Plan a small deliverable, create a first iteration, and identify the next milestone.'], activity: { ...baseActivity, title: 'Project milestone sprint', instructions: ['Define the deliverable and audience.', 'Create a first iteration using the concept.', 'Use the criteria to identify one improvement.', 'Record the next milestone and responsibility.'] } },
    'Exam Revision': { teacher: ['Model how to recognise the question type, select a method, and check an answer.'], students: ['Attempt a timed question, compare methods, and correct the reasoning.'], activity: { ...baseActivity, title: 'Exam-style retrieval and correction', instructions: ['Attempt the question independently under a short time limit.', 'Compare the method with the success criteria.', 'Correct one error and explain why it occurred.', 'Write a compact strategy for a similar question.'] } },
    'Tutorial': { teacher: ['Diagnose the learner’s starting point and provide just-in-time scaffolds.'], students: ['Explain their current thinking, try a scaffold, and gradually remove support.'], activity: { ...baseActivity, title: 'Guided tutorial pathway', instructions: ['State what feels clear and what feels uncertain.', 'Work through the first step with a scaffold.', 'Attempt the next step independently.', 'Explain which support can now be removed.'] } },
  };
  const selected = variants[style];
  return { ...withActions(lesson, selected.teacher, selected.students, selected.activity, selected.homework), adaptationNote: `Teaching style changed to ${style}. Core topic, objectives, explanation, and lesson purpose were preserved.` };
}

export function buildMisconceptionLab(lesson: GeneratedLesson) {
  const misconception = lesson.explanation.misconception || 'Learners may overgeneralise the central concept.';
  return {
    misconception,
    why: 'This belief is plausible because learners are asked to connect a new term to familiar experience before they have seen its limits.',
    correct: lesson.explanation.plainLanguage,
    counterexample: `Show a contrasting ${lesson.activity.title.toLowerCase()} example where the same surface pattern leads to a different conclusion.`,
    diagnostic: lesson.assessment.questions[0]?.question || `What would change if one assumption in ${lesson.title} were removed?`,
    response: lesson.assessment.questions[0]?.answer || 'A precise response should name the relevant condition and explain the consequence.',
    followUp: 'Ask learners to revise their original explanation in one sentence, then compare it with the success criteria.',
  };
}

export function buildContingencies(lesson: GeneratedLesson, request: LessonRequest) {
  return [
    { label: 'Students finish early', action: `Ask groups to extend the ${lesson.activity.title.toLowerCase()} with a new example and defend the change.`, move: 'Extend with transfer', then: 'Invite a second group to challenge the new example.' },
    { label: 'Students are struggling', action: `Return to the plain-language explanation, model the first step, and run a 3-minute retrieval check on ${request.priorKnowledge}.`, move: 'Reduce the load', then: 'Release the next step only after a quick check.' },
    { label: 'Discussion becomes very active', action: 'Capture the strongest two ideas, name the time boundary, and move unresolved questions to the final reflection.', move: 'Harvest and focus', then: 'Reconnect the discussion to the success criteria.' },
    { label: 'Technology fails', action: `Use the ${lesson.activity.materials[0] || 'printed scenario'} and have groups record reasoning on paper or the board.`, move: 'Switch the medium', then: 'Keep the same objective and evidence.' },
    { label: 'Students are silent', action: 'Switch from whole-class questioning to silent writing, pair rehearsal, and an invitation to share a revised response.', move: 'Lower the social risk', then: 'Ask for a revised response rather than a first answer.' },
    { label: 'There are 10 minutes less', action: `Compress the ${lesson.lessonSequence[1]?.phase || 'explanation'} and preserve the practice plus exit check; remove optional extension.`, move: 'Protect evidence of learning', then: 'Use the exit response to decide what moves forward.' },
    { label: 'There are 10 minutes more', action: `Add a contrasting example and ask learners to improve their ${lesson.activity.title.toLowerCase()} against the success criteria.`, move: 'Add productive stretch', then: 'Make the improvement visible to peers.' },
  ];
}

function safeObjective(lesson: GeneratedLesson, index: number) {
  return lesson.learningObjectives[index % Math.max(lesson.learningObjectives.length, 1)] || lesson.title;
}

function sentence(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/[.!?]+$/, '') : fallback;
}

export function buildLearningFriction(lesson: GeneratedLesson, request: LessonRequest): LearningFriction[] {
  const friction: LearningFriction[] = [];
  if (request.priorKnowledge.trim().length < 12) friction.push({ id: 'prerequisite-bridge', concept: 'Prerequisite bridge', reason: 'The brief gives learners little explicit starting knowledge to retrieve.', evidence: request.priorKnowledge.trim() ? `Prior knowledge supplied: “${request.priorKnowledge}”.` : 'No prior knowledge was supplied in the brief.', move: 'Open with two low-stakes retrieval questions and a worked first step before introducing new terminology.', target: 'lesson-brief', severity: 'high' });
  if (lesson.explanation.plainLanguage.length < 80 || lesson.explanation.analogy.length < 45) friction.push({ id: 'abstract-language', concept: 'Abstract explanation', reason: 'The explanation may ask learners to hold a new idea before seeing its boundaries.', evidence: `Plain-language explanation is ${lesson.explanation.plainLanguage.length} characters and the analogy is ${lesson.explanation.analogy.length} characters.`, move: 'Pair one concrete example with a non-example, then ask learners to explain the difference in their own words.', target: 'explanation', severity: 'medium' });
  if (lesson.activity.instructions.length < 4 || !lesson.activity.expectedOutcome) friction.push({ id: 'practice-visibility', concept: 'Practice visibility', reason: 'Learners may not know what a successful attempt looks like.', evidence: `${lesson.activity.instructions.length} activity steps are currently visible.`, move: 'Show the expected outcome before the task and add a short peer-check against one criterion.', target: 'activity', severity: 'medium' });
  if (lesson.assessment.questions.length < Math.max(3, lesson.learningObjectives.length + 1)) friction.push({ id: 'evidence-gap', concept: 'Evidence of understanding', reason: 'The plan has fewer checks than the number of outcomes it asks learners to reach.', evidence: `${lesson.assessment.questions.length} questions for ${lesson.learningObjectives.length} learning objectives.`, move: 'Insert one diagnostic question before practice and one transfer question after it.', target: 'assessment', severity: 'high' });
  if (lesson.explanation.misconception.trim()) friction.push({ id: 'misconception-risk', concept: 'Plausible misconception', reason: 'The concept already has a named misconception that should be surfaced rather than corrected only at the end.', evidence: `The lesson names: “${lesson.explanation.misconception}”.`, move: 'Elicit the belief early, contrast it with a counterexample, and revisit it in the exit check.', target: 'misconception-lab', severity: 'medium' });
  return friction.length ? friction : [{ id: 'transfer-friction', concept: 'Transfer to a new context', reason: 'Even a well-structured lesson can become fragile when learners meet a new context.', evidence: 'No high-signal design gap was detected by the deterministic checks.', move: 'End with a short “what would change if…” transfer prompt.', target: 'assessment', severity: 'low' }];
}

export function buildFrictionIntervention(lesson: GeneratedLesson, item: LearningFriction): { intervention: { title: string; before: string; after: string; purpose: string; target: string }; lesson: GeneratedLesson } {
  const intervention = item.id === 'evidence-gap'
    ? { title: 'Add a diagnostic and transfer check', before: `${lesson.assessment.questions.length} checks currently appear in the assessment.`, after: 'Add a before-practice diagnostic and an after-practice transfer question.', purpose: 'Make the learning signal visible at the point where the teacher can still adapt.', target: item.target }
    : item.id === 'practice-visibility'
      ? { title: 'Make the practice outcome visible', before: lesson.activity.expectedOutcome || 'The activity has no stated outcome.', after: `${sentence(lesson.activity.expectedOutcome, 'Learners apply the concept')} Then ask peers to check one success criterion.`, purpose: 'Give learners a concrete quality bar before they begin.', target: item.target }
      : item.id === 'prerequisite-bridge'
        ? { title: 'Insert a retrieval bridge', before: 'The lesson moves into the new concept with limited explicit retrieval.', after: `Start with two quick prompts about ${sentence(lesson.activity.title, 'the prior idea')} and model the first step before new terminology.`, purpose: 'Lower the entry load without changing the objective.', target: item.target }
        : { title: `Address ${item.concept.toLowerCase()}`, before: item.reason, after: item.move, purpose: 'Turn a forecast into a visible, reversible teaching move.', target: item.target };
  const nextLesson: GeneratedLesson = item.id === 'evidence-gap' ? { ...lesson, assessment: { ...lesson.assessment, questions: [...lesson.assessment.questions, { question: `What would change if one assumption in ${lesson.title} changed?`, answer: 'A justified response that names the changed condition and its consequence.', rationale: 'This creates a transfer check after practice.' }] } } : item.id === 'practice-visibility' ? { ...lesson, activity: { ...lesson.activity, expectedOutcome: `${sentence(lesson.activity.expectedOutcome, 'Learners apply the concept')}. Peer-check one response against the success criteria.` } } : { ...lesson, adaptationNote: `${item.move} This proposed intervention addresses ${item.concept.toLowerCase()}.` };
  return { intervention, lesson: nextLesson };
}

export function buildQuestionBank(lesson: GeneratedLesson): LessonQuestion[] {
  const categories: QuestionCategory[] = ['Recall', 'Understanding', 'Application', 'Analysis', 'Evaluation', 'Discussion', 'Exit Ticket', 'Exam Practice'];
  const difficulties: QuestionDifficulty[] = ['Foundation', 'Core', 'Stretch'];
  const base = lesson.assessment.questions.map((item, index) => ({ id: `lesson-${index}`, category: categories[index % categories.length], question: item.question, purpose: item.rationale, difficulty: index === 0 ? 'Foundation' as const : 'Core' as const, answer: item.answer, rationale: item.rationale, objective: safeObjective(lesson, index), source: 'lesson' as const }));
  const derived: LessonQuestion[] = [
    { id: 'diagnostic-1', category: 'Diagnostic', question: `Before we begin, what do you already think ${lesson.title.toLowerCase()} means?`, purpose: 'Surface starting ideas and misconceptions.', difficulty: 'Foundation', answer: 'Any plausible starting explanation is useful evidence.', rationale: 'The teacher can decide whether to revisit the prerequisite bridge.', objective: safeObjective(lesson, 0), source: 'derived' },
    { id: 'understanding-1', category: 'Understanding', question: `How would you explain ${lesson.title.toLowerCase()} without using its specialist vocabulary?`, purpose: 'Check conceptual understanding in plain language.', difficulty: 'Core', answer: lesson.explanation.plainLanguage, rationale: 'A clear explanation indicates the learner has connected the parts.', objective: safeObjective(lesson, 0), source: 'derived' },
    { id: 'analysis-1', category: 'Analysis', question: 'Which assumption in the worked example is doing the most work, and what happens if it changes?', purpose: 'Make the structure of the example visible.', difficulty: 'Stretch', answer: 'The answer should name an assumption and trace its consequence.', rationale: 'This moves beyond recall into conditional reasoning.', objective: safeObjective(lesson, 1), source: 'derived' },
    { id: 'discussion-1', category: 'Discussion', question: `Which example best shows the boundary of ${lesson.title.toLowerCase()}? Defend your choice.`, purpose: 'Invite comparison and evidence-based talk.', difficulty: 'Core', answer: 'A defensible choice linked to the lesson criteria.', rationale: 'Discussion becomes evidence of reasoning rather than opinion only.', objective: safeObjective(lesson, 1), source: 'derived' },
    { id: 'exit-1', category: 'Exit Ticket', question: 'What can you now do, and what is the next question you would ask?', purpose: 'Close with a usable learning signal.', difficulty: 'Foundation', answer: 'A specific capability plus a genuine next question.', rationale: 'The response supports the next lesson decision.', objective: safeObjective(lesson, 2), source: 'derived' },
    { id: 'exam-1', category: 'Exam Practice', question: `Write a concise answer to this prompt: apply ${lesson.title.toLowerCase()} to a new context and justify the choice.`, purpose: 'Practise transfer under exam-like constraints.', difficulty: 'Stretch', answer: 'A concise application with a justified link to the concept.', rationale: 'This checks transfer, not just recognition.', objective: safeObjective(lesson, 2), source: 'derived' },
  ];
  return [...base, ...derived];
}

export function buildDiagnosticQuestions(lesson: GeneratedLesson, request: LessonRequest) {
  return [
    { id: 'diagnostic-start', prompt: `What do you already think ${lesson.title.toLowerCase()} means?`, signal: 'Listen for the prerequisite learners are using.', response: `If the signal is weak, use a brief retrieval bridge about ${request.priorKnowledge || 'the prior concept'} before explaining.` },
    { id: 'diagnostic-boundary', prompt: `Which example would not fit ${lesson.title.toLowerCase()}, and why?`, signal: 'Listen for whether learners can name a boundary rather than repeat a definition.', response: 'If boundaries are unclear, contrast one example and one non-example.' },
    { id: 'diagnostic-transfer', prompt: 'What would change if one assumption in the worked example changed?', signal: 'Listen for conditional reasoning and causal language.', response: 'If answers stay descriptive, model the first conditional step and ask for a revised response.' },
  ];
}

export function buildExampleLadder(lesson: GeneratedLesson, request: LessonRequest): ExampleLadder {
  const concept = sentence(lesson.title, request.topic || 'the concept');
  return { concept, levels: [
    { level: 1, label: 'Familiar anchor', example: `Start with an everyday situation that has the same broad pattern as ${concept.toLowerCase()}.`, teachingMove: 'Ask learners to name what feels familiar before adding new terminology.' },
    { level: 2, label: 'Concrete case', example: lesson.explanation.workedExample, teachingMove: 'Model one complete case and make each decision visible.' },
    { level: 3, label: 'Guided variation', example: `Change one feature of the ${lesson.activity.title.toLowerCase()} and ask what should stay the same.`, teachingMove: 'Prompt pairs to compare the original and changed case.' },
    { level: 4, label: 'Independent application', example: `Learners choose a new ${request.subject || 'subject'} example and justify why the concept applies.`, teachingMove: 'Remove the worked scaffold and keep only the success criterion.' },
    { level: 5, label: 'Boundary case', example: `Present a case that looks similar but does not fit ${concept.toLowerCase()}, and ask learners to locate the boundary.`, teachingMove: 'Close by revising the rule in precise language.' },
  ] };
}

export function buildAnalogyQuality(lesson: GeneratedLesson): AnalogyQuality {
  return { analogy: lesson.explanation.analogy, whatItExplains: 'The analogy gives learners a familiar structure for the parts and sequence of the concept.', whereItBreaks: 'It may break when the real concept has constraints, exceptions, feedback, or scale that the everyday comparison does not share.', alternative: lesson.explanation.plainLanguage };
}

export function buildAccessibilitySuggestions(lesson: GeneratedLesson): AccessibilitySuggestion[] {
  return [
    { id: 'plain-language', label: 'Lead with plain language', reason: 'Reduce terminology load before introducing formal labels.', evidence: `The lesson uses the topic label “${lesson.title}” as its main entry point.`, before: lesson.explanation.plainLanguage, after: `${sentence(lesson.explanation.plainLanguage, 'Start with the central idea')}. Add the formal term only after learners can explain the idea in their own words.`, target: 'explanation' },
    { id: 'numbered-steps', label: 'Number the activity moves', reason: 'Make the task easier to enter and easier to pause or resume.', evidence: `${lesson.activity.instructions.length} instructions are currently listed.`, before: lesson.activity.instructions.join(' '), after: lesson.activity.instructions.map((step, index) => `${index + 1}. ${step}`).join(' '), target: 'activity' },
    { id: 'multiple-entry', label: 'Offer two ways to respond', reason: 'Support learners who need rehearsal before speaking publicly.', evidence: 'The activity currently asks groups to make reasoning visible in one shared format.', before: lesson.activity.expectedOutcome, after: `${lesson.activity.expectedOutcome} Learners may first write, sketch, or rehearse with a partner before sharing.`, target: 'activity' },
  ];
}

export function buildLearnerPaths(lesson: GeneratedLesson): LearnerPath[] {
  return [
    { name: 'Foundation', description: 'More structure and a smaller first step.', changes: ['Use the plain-language explanation first.', 'Model the first step before independent work.', 'Keep one success criterion visible.'], activity: 'Complete the first example with a partner, then finish a parallel example using a scaffold.', question: 'Which part of the example is clear, and which step needs another model?', extension: 'Explain the scaffolded answer using one formal term.' },
    { name: 'Standard', description: 'The core route through explanation, practice, and evidence.', changes: ['Use the planned activity and core question bank.', 'Compare reasoning with a peer.', 'Close with an exit ticket.'], activity: lesson.activity.title, question: `How does your response demonstrate ${safeObjective(lesson, 0).toLowerCase()}?`, extension: 'Revise one part of the response against the success criteria.' },
    { name: 'Challenge', description: 'More independence, transfer, and boundary testing.', changes: ['Skip the first worked scaffold if ready.', 'Use a new context or counterexample.', 'Defend a choice with explicit evidence.'], activity: 'Apply the concept to a new context, then construct a boundary case that tests the rule.', question: 'What assumption is carrying the most weight, and what changes if it is removed?', extension: 'Write a short challenge question for another learner.' },
  ];
}

export function buildCourseArcIntelligence(arc: { title: string; positioning: string; weeks: { week: number; theme: string; outcome: string; sessions: { title: string; focus: string; activity: string; check: string }[] }[] }) {
  const sessions = arc.weeks.flatMap((week) => week.sessions);
  const checks = sessions.filter((session) => session.check.trim()).length;
  const practice = sessions.filter((session) => /apply|practice|task|group|peer|critique/i.test(`${session.focus} ${session.activity}`)).length;
  const themes = arc.weeks.map((week) => week.theme);
  const flags: string[] = [];
  if (practice < Math.ceil(sessions.length * 0.5)) flags.push('Add another visible practice or critique move before the final demonstration.');
  if (checks < sessions.length) flags.push('Give every session a lightweight evidence-of-learning check.');
  if (new Set(themes).size < themes.length) flags.push('Two weeks share a theme; clarify the progression or name the deliberate revisit.');
  if (!flags.length) flags.push('The arc has a visible progression, recurring checks, and enough application to support continuity.');
  return { coherence: Math.min(98, 72 + Math.round((new Set(themes).size / Math.max(themes.length, 1)) * 20)), practiceRatio: Math.round((practice / Math.max(sessions.length, 1)) * 100), checkCoverage: Math.round((checks / Math.max(sessions.length, 1)) * 100), flags, recommendedMoves: ['Carry the prior session’s exit response into the next opening retrieval prompt.', 'Use the same success language across weekly outcomes and lesson-level rubrics.', 'When a lesson is saved, attach its reflection to the matching course session before revising the arc.'] };
}

export function buildImprovementSuggestions(lesson: GeneratedLesson, reflection: LessonReflection): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];
  if (reflection.understanding === 'Needs reinforcement' || reflection.understanding === 'Mixed' || reflection.whereStruggled.trim()) suggestions.push({ id: 'reinforce-concept', problem: 'Learners may need another route into the difficult concept.', evidence: reflection.whereStruggled || reflection.difficultConcept || 'The reflection marked understanding as needing reinforcement.', change: 'Move the concrete example earlier, add a counterexample, and revisit the idea in the exit check.', purpose: 'Make the next lesson more diagnostic and less dependent on one explanation.', target: 'explanation', before: lesson.explanation.workedExample, after: `Begin with the example, ask what changes in a counterexample, then introduce the formal explanation. ${lesson.explanation.workedExample}` , status: 'proposed' });
  if (reflection.timingObservation === 'Ran over' || /long|late|ran over/i.test(reflection.timing)) suggestions.push({ id: 'tighten-sequence', problem: 'The planned sequence may be carrying too much activity for the available time.', evidence: reflection.timing || 'The reflection marked the lesson as running over.', change: 'Protect the practice and exit check; shorten the explanation and move extension work to homework.', purpose: 'Keep evidence of learning visible when time is constrained.', target: 'lesson-sequence', before: 'The current sequence uses the full planned arc with optional extension inside the lesson.', after: 'Shorten the explanation by 3–5 minutes and preserve practice plus exit check.' , status: 'proposed' });
  if (reflection.activityEngagement === 'Low' || reflection.discussion.trim()) suggestions.push({ id: 'change-activity', problem: 'The activity may need a lower-risk entry and a clearer reason to talk.', evidence: reflection.discussion || 'The reflection marked engagement as low.', change: 'Use silent writing, pair rehearsal, then a structured comparison before whole-class sharing.', purpose: 'Create more visible participation without changing the objective.', target: 'activity', before: lesson.activity.instructions.join(' '), after: `Start silently, rehearse with a partner, then compare two responses. ${lesson.activity.instructions.join(' ')}`, status: 'proposed' });
  if (!suggestions.length) suggestions.push({ id: 'keep-and-stretch', problem: 'No urgent change was recorded.', evidence: reflection.whatWorked || 'The reflection did not flag a major issue.', change: 'Keep the core structure and add one boundary-case transfer question.', purpose: 'Improve the next iteration without overcorrecting a lesson that worked.', target: 'assessment', before: lesson.assessment.questions.at(-1)?.question || 'The current assessment', after: 'Add one “what would change if…” transfer question.', status: 'proposed' });
  return suggestions;
}

export function applyImprovementSuggestion(lesson: GeneratedLesson, suggestion: ImprovementSuggestion): GeneratedLesson {
  if (suggestion.id === 'reinforce-concept') return { ...lesson, explanation: { ...lesson.explanation, workedExample: suggestion.after }, version: (lesson.version || 1) + 1, adaptationNote: 'Improvement accepted: concrete example moved earlier and paired with a counterexample.' };
  if (suggestion.id === 'tighten-sequence') return { ...lesson, lessonSequence: lesson.lessonSequence.map((phase, index) => index === 1 ? { ...phase, minutes: Math.max(1, phase.minutes - 3) } : index === 2 ? { ...phase, minutes: phase.minutes + 3 } : phase), version: (lesson.version || 1) + 1, adaptationNote: 'Improvement accepted: time moved from explanation into protected practice.' };
  if (suggestion.id === 'change-activity') return { ...lesson, activity: { ...lesson.activity, instructions: suggestion.after.split('. ').filter(Boolean) }, version: (lesson.version || 1) + 1, adaptationNote: 'Improvement accepted: added silent writing and pair rehearsal before whole-class sharing.' };
  return { ...lesson, assessment: { ...lesson.assessment, questions: [...lesson.assessment.questions, { question: suggestion.after, answer: 'A justified response that traces the changed condition.', rationale: 'This checks transfer without replacing the core assessment.' }] }, version: (lesson.version || 1) + 1, adaptationNote: 'Improvement accepted: added a boundary-case transfer check.' };
}
