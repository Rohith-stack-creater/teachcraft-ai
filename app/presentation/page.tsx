'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GeneratedLesson, LessonReflection, LessonRequest, TeachingSession } from '../../lib/types';
import { buildDiagnosticQuestions, buildExampleLadder, buildImprovementSuggestions, applyImprovementSuggestion } from '../../lib/intelligence';
import { appendTeachingEvent, completeTeachingSession, createTeachingSession, eventTypeForAdaptation, plannedActualSummary } from '../../lib/teaching-memory';
import { createSupabaseBrowserClient } from '../../lib/supabase-browser';

type StoredLesson = { lesson: GeneratedLesson; form: LessonRequest; savedLessonId?: string; teachingSession?: TeachingSession };
type CheckpointType = 'confidence' | 'yesno' | 'choice' | 'minute' | 'thinkpair' | 'raisehand' | 'exit';
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function formatClock(seconds: number) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }

const checkpointOptions: { type: CheckpointType; label: string; prompt: string; answers: string[] }[] = [
  { type: 'confidence', label: 'Quick confidence check', prompt: 'How confident is the class?', answers: ['1 — Not confident', '2 — Slightly confident', '3 — Mostly confident', '4 — Very confident', '5 — Completely confident'] },
  { type: 'yesno', label: 'Yes / No', prompt: 'Can learners explain the central idea without the worked example?', answers: ['Yes', 'No', 'Not sure yet'] },
  { type: 'choice', label: 'Multiple choice', prompt: 'Which response best applies the lesson idea?', answers: ['A — The first plausible answer', 'B — The answer supported by the stated criteria', 'C — The most familiar example', 'D — The answer with the most detail'] },
  { type: 'minute', label: 'One-minute response', prompt: 'In one minute, write the key idea and one uncertainty.', answers: ['Response captured'] },
  { type: 'thinkpair', label: 'Think–Pair–Share', prompt: 'Think silently, compare with a partner, then share one revised response.', answers: ['Ready to share'] },
  { type: 'raisehand', label: 'Raise-hand discussion', prompt: 'Raise a hand if you can explain the next step, then invite one contrasting explanation.', answers: ['Hands raised'] },
  { type: 'exit', label: 'Exit ticket', prompt: 'What is one idea you can use after today’s lesson?', answers: ['Exit response captured'] },
];

export default function PresentationPage() {
  const [stored, setStored] = useState<StoredLesson | null>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [checkpoint, setCheckpoint] = useState<CheckpointType>('confidence');
  const [checkpointAnswer, setCheckpointAnswer] = useState('');
  const [checkpointMessage, setCheckpointMessage] = useState('');
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [reflection, setReflection] = useState<LessonReflection>({ whatWorked: '', whereStruggled: '', discussion: '', reinforcement: '', timing: '', nextChange: '', understanding: 'Mostly understood', timingObservation: 'On time', activityEngagement: 'Moderate', difficultConcept: '', lecturerConfidence: '', mostUsefulActivity: '' });
  const [reflectionMessage, setReflectionMessage] = useState('');
  const [adaptationMessage, setAdaptationMessage] = useState('');
  const [diagnosticIndex, setDiagnosticIndex] = useState(0);
  const [ladderIndex, setLadderIndex] = useState(0);
  const [improvements, setImprovements] = useState<ReturnType<typeof buildImprovementSuggestions>>([]);
  const [sessionMessage, setSessionMessage] = useState('');
  const [sessionContextOpen, setSessionContextOpen] = useState(false);
  const [sessionCohort, setSessionCohort] = useState('');
  const [sessionCourseContext, setSessionCourseContext] = useState('');

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem('teachcraft-current-lesson');
      if (!raw) { setError('Open a lesson from the studio to start presentation mode.'); return; }
      const parsed = JSON.parse(raw) as StoredLesson;
      setStored(parsed);
      if (parsed.lesson.reflection) setReflection(parsed.lesson.reflection);
    } catch { setError('This lesson could not be opened in presentation mode.'); }
  }, []);

  const sequence = stored?.lesson.lessonSequence || [];
  const phase = sequence[phaseIndex];
  const prompts = stored?.lesson.assessment.questions || [];
  const prompt = prompts[promptIndex];
  const selectedCheckpoint = checkpointOptions.find((item) => item.type === checkpoint) || checkpointOptions[0];
  const diagnostics = stored ? buildDiagnosticQuestions(stored.lesson, stored.form) : [];
  const ladder = stored ? buildExampleLadder(stored.lesson, stored.form) : null;
  const currentDiagnostic = diagnostics[diagnosticIndex % Math.max(diagnostics.length, 1)];
  const currentExample = ladder?.levels[ladderIndex % Math.max(ladder.levels.length, 1)];
  useEffect(() => { if (phase) { setSecondsLeft(phase.minutes * 60); setRunning(false); } }, [phaseIndex, phase?.minutes]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSecondsLeft((current) => { if (current <= 1) { setRunning(false); return 0; } return current - 1; }), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  const progress = useMemo(() => sequence.length ? ((phaseIndex + 1) / sequence.length) * 100 : 0, [phaseIndex, sequence.length]);

  async function persistTeachingSession(session: TeachingSession) {
    if (demoMode || !stored?.savedLessonId) return;
    try {
      const supabase = createSupabaseBrowserClient();
      const auth = await supabase.auth.getUser();
      if (!auth.data.user) return;
      const row = { id: session.id, lesson_id: stored.savedLessonId, user_id: auth.data.user.id, course_context: session.courseContext || null, cohort: session.cohort || null, planned_duration: session.plannedDuration, actual_duration: session.actualDuration || null, session_date: session.sessionDate, status: session.status, started_at: session.startedAt || null, completed_at: session.completedAt || null, checkpoint_observations: session.checkpointObservations, timing_changes: session.timingChanges, adaptations_used: session.adaptationsUsed, difficult_concepts: session.difficultConcepts, activity_engagement: session.activityEngagement || null, understanding_observation: session.understandingObservation || null, lecturer_confidence: session.lecturerConfidence || null, reflection: session.reflection || null, improvement_suggestions: session.improvementSuggestions || [], events: session.events };
      const result = await supabase.from('teaching_sessions').upsert(row).select('id').single();
      if (result.error) throw result.error;
      setSessionMessage('Teaching session synced to your library.');
    } catch { setSessionMessage('Session kept locally; library sync failed. Retry when your connection is restored.'); }
  }
  async function startSession() {
    if (!stored || stored.teachingSession) return;
    const session = createTeachingSession({ lessonId: stored.savedLessonId, plannedDuration: stored.lesson.lessonSequence.reduce((sum, item) => sum + item.minutes, 0), cohort: sessionCohort, courseContext: sessionCourseContext });
    const nextStored = { ...stored, teachingSession: session };
    setStored(nextStored); setSessionMessage(demoMode ? 'Demo teaching session started locally. No account data was created.' : stored.savedLessonId ? 'Teaching session started.' : 'Teaching session started locally. Save the lesson first to sync it.');
    window.sessionStorage.setItem('teachcraft-current-lesson', JSON.stringify(nextStored));
    await persistTeachingSession(session);
  }
  function triggerCheckpoint() {
    const message = checkpointAnswer ? `Checkpoint noted: ${checkpointAnswer}. Use the response to decide whether to continue, revisit, or adapt.` : 'Checkpoint ready. Invite responses, then record the class signal here.';
    setCheckpointMessage(message);
    if (stored?.teachingSession && checkpointAnswer) {
      const session = appendTeachingEvent(stored.teachingSession, { type: 'checkpoint', label: selectedCheckpoint.label, detail: checkpointAnswer, phase: phase?.phase });
      const nextStored = { ...stored, teachingSession: session }; setStored(nextStored); window.sessionStorage.setItem('teachcraft-current-lesson', JSON.stringify(nextStored)); void persistTeachingSession(session);
    }
  }
  function adjustSchedule(kind: 'slow' | 'example' | 'practice' | 'simple' | 'diagnostic' | 'skip' | 'extend') {
    if (!stored || !phase) return;
    const shifts: Record<typeof kind, number> = { slow: 3, example: 3, practice: 5, simple: 2, diagnostic: 3, skip: -5, extend: 5 };
    const shift = shifts[kind];
    const nextSequence = stored.lesson.lessonSequence.map((item, index) => index === phaseIndex ? { ...item, minutes: Math.max(1, item.minutes + shift) } : item);
    const nextLesson = { ...stored.lesson, lessonSequence: nextSequence, adaptationNote: `${kind === 'skip' ? 'Removed' : 'Added'} ${Math.abs(shift)} minutes ${kind === 'skip' ? 'from' : 'to'} ${phase.phase} during presentation.` };
    const nextSession = stored.teachingSession ? appendTeachingEvent(stored.teachingSession, { type: eventTypeForAdaptation(kind), label: nextLesson.adaptationNote, detail: nextLesson.adaptationNote, phase: phase.phase, minutesDelta: shift }) : undefined;
    const nextStored = { ...stored, lesson: nextLesson, teachingSession: nextSession };
    setStored(nextStored); setSecondsLeft(Math.max(0, secondsLeft + shift * 60)); setAdaptationMessage(`${nextLesson.adaptationNote} The change is shown in the timeline.`); window.sessionStorage.setItem('teachcraft-current-lesson', JSON.stringify(nextStored)); if (nextSession) void persistTeachingSession(nextSession);
  }
  async function completeSession() {
    if (!stored?.teachingSession) { setSessionMessage('Start a Teaching Session before completing the lesson.'); return; }
    const actual = Math.max(1, stored.teachingSession.plannedDuration + stored.teachingSession.timingChanges.reduce((sum, item) => sum + item.minutesDelta, 0));
    const session = completeTeachingSession(stored.teachingSession, actual);
    const nextStored = { ...stored, lesson: { ...stored.lesson, status: 'Taught' as const }, teachingSession: session };
    setStored(nextStored); setRunning(false); window.sessionStorage.setItem('teachcraft-current-lesson', JSON.stringify(nextStored)); setSessionMessage(`Session completed: ${actual} minutes actual against ${session.plannedDuration} planned.`); await persistTeachingSession(session);
    if (!demoMode && stored.savedLessonId) { try { const supabase = createSupabaseBrowserClient(); await supabase.from('lessons').update({ status: 'Taught', updated_at: new Date().toISOString() }).eq('id', stored.savedLessonId); } catch { /* session record remains the source of teaching evidence */ } }
  }
  async function saveReflection() {
    if (!stored) return;
    const savedReflection = { ...reflection, savedAt: new Date().toISOString() };
    const nextImprovements = buildImprovementSuggestions(stored.lesson, savedReflection);
    setImprovements(nextImprovements);
    const nextLesson = { ...stored.lesson, reflection: savedReflection, improvementSuggestions: nextImprovements, status: savedReflection.understanding === 'Needs reinforcement' || savedReflection.understanding === 'Mixed' ? 'Needs Revision' as const : stored.lesson.status };
    const nextSession = stored.teachingSession ? appendTeachingEvent({ ...stored.teachingSession, reflection: savedReflection, understandingObservation: savedReflection.understanding, activityEngagement: savedReflection.activityEngagement, lecturerConfidence: savedReflection.lecturerConfidence, difficultConcepts: savedReflection.difficultConcept ? [savedReflection.difficultConcept] : stored.teachingSession.difficultConcepts, improvementSuggestions: nextImprovements }, { type: 'reflection_saved', label: 'Reflection saved', detail: savedReflection.nextChange || savedReflection.whatWorked }) : undefined;
    const nextStored = { ...stored, lesson: nextLesson, teachingSession: nextSession };
    window.sessionStorage.setItem('teachcraft-current-lesson', JSON.stringify(nextStored)); setStored(nextStored); setReflection(savedReflection); setReflectionMessage('Reflection saved to this lesson session.');
    if (nextSession) await persistTeachingSession(nextSession);
    if (stored.savedLessonId && !demoMode) {
      try { const supabase = createSupabaseBrowserClient(); const result = await supabase.from('lessons').update({ content: nextLesson, status: nextLesson.status, updated_at: new Date().toISOString() }).eq('id', stored.savedLessonId); if (result.error) throw result.error; setReflectionMessage('Reflection saved to your lesson library.'); } catch { setReflectionMessage('Reflection saved locally, but library sync failed. Retry when your connection is restored.'); }
    }
  }

  async function acceptImprovement(id: string) {
    if (!stored) return;
    const suggestion = improvements.find((item) => item.id === id);
    if (!suggestion) return;
    const nextLesson = applyImprovementSuggestion(stored.lesson, suggestion);
    const nextImprovements = improvements.map((item) => item.id === id ? { ...item, status: 'accepted' as const } : item);
    const nextStored = { ...stored, lesson: { ...nextLesson, improvementSuggestions: nextImprovements } };
    setStored(nextStored); setImprovements(nextImprovements); window.sessionStorage.setItem('teachcraft-current-lesson', JSON.stringify(nextStored)); setReflectionMessage(`Improvement accepted: Version ${nextLesson.version || 2} created locally.`);
    if (!demoMode && stored.savedLessonId) {
      try {
        const supabase = createSupabaseBrowserClient(); const auth = await supabase.auth.getUser(); if (!auth.data.user) return;
        const updateResult = await supabase.from('lessons').update({ content: nextStored.lesson, version: nextStored.lesson.version || 2, status: 'Needs Revision', updated_at: new Date().toISOString() }).eq('id', stored.savedLessonId); if (updateResult.error) throw updateResult.error;
        const versionResult = await supabase.from('lesson_versions').insert({ lesson_id: stored.savedLessonId, user_id: auth.data.user.id, version_number: nextStored.lesson.version || 2, content: nextStored.lesson, change_summary: suggestion.change, change_reason: suggestion.evidence }); if (versionResult.error) throw versionResult.error;
        setReflectionMessage(`Improvement accepted and Version ${nextStored.lesson.version || 2} saved to your library.`);
      } catch { setReflectionMessage('Version kept locally; library sync failed. Retry when your connection is restored.'); }
    }
  }
  function rejectImprovement(id: string) { setImprovements((current) => current.map((item) => item.id === id ? { ...item, status: 'rejected' as const } : item)); }

  if (error) return <main className="presentation-shell presentation-empty"><div className="presentation-card"><span className="presentation-kicker">TEACHCRAFT</span><h1>Presentation mode</h1><p>{error}</p><button className="presentation-button" onClick={() => window.location.assign('/')}>Return to studio</button></div></main>;
  if (!stored || !phase) return <main className="presentation-shell presentation-empty"><div className="presentation-card"><span className="presentation-kicker">TEACHCRAFT</span><h1>Loading your lesson</h1><div className="loader" /></div></main>;

  return <main className="presentation-shell">
    <header className="presentation-topbar"><button className="presentation-brand" onClick={() => window.location.assign('/')}><span className="presentation-mark">TC</span><span>TeachCraft</span></button><div className="presentation-top-actions"><span>{stored.form.subject}</span>{stored.teachingSession ? <button className="presentation-button" onClick={() => void completeSession()} disabled={stored.teachingSession.status === 'Completed'}>{stored.teachingSession.status === 'Completed' ? 'Session completed' : 'Complete session'}</button> : <button className="presentation-button" onClick={() => setSessionContextOpen((value) => !value)}>Start teaching session</button>}<button className="presentation-quiet" onClick={() => setReflectionOpen((value) => !value)}>{reflectionOpen ? 'Close reflection' : 'Reflect'}</button><button className="presentation-quiet" onClick={() => window.print()}>Print</button><button className="presentation-quiet" onClick={() => window.history.back()}>Exit</button></div></header>
    {sessionContextOpen && !stored.teachingSession && <section className="session-start-panel"><div><span className="presentation-kicker">TEACHING SESSION</span><h2>Record this delivery.</h2><p>A lesson is reusable; this session captures one actual delivery. Only teaching evidence is stored.</p></div><label>Cohort<input value={sessionCohort} onChange={(event) => setSessionCohort(event.target.value)} placeholder="Optional cohort or group" /></label><label>Course context<input value={sessionCourseContext} onChange={(event) => setSessionCourseContext(event.target.value)} placeholder="Optional course or week" /></label><button className="presentation-button" onClick={() => { setSessionContextOpen(false); void startSession(); }}>Start session</button></section>}
    {stored.teachingSession && <section className="session-status-panel"><div><span className="presentation-kicker">TEACHING SESSION · {stored.teachingSession.status.toUpperCase()}</span><strong>{stored.teachingSession.cohort || 'No cohort recorded'}</strong><small>{stored.teachingSession.plannedDuration} min planned · {stored.teachingSession.events.length} evidence events</small></div><div>{sessionMessage && <small>{sessionMessage}</small>}<button className="presentation-quiet" onClick={() => setReflectionOpen(true)}>Open reflection</button></div></section>}
    <section className="presentation-progress"><div style={{ width: `${progress}%` }} /></section>
    {reflectionOpen ? <ReflectionPanel reflection={reflection} setReflection={setReflection} message={reflectionMessage} onSave={() => void saveReflection()} improvements={improvements} onAcceptImprovement={acceptImprovement} onRejectImprovement={rejectImprovement} session={stored.teachingSession} /> : <section className="presentation-layout"><div className="presentation-main"><span className="presentation-kicker">PHASE {phaseIndex + 1} OF {sequence.length}</span><h1>{phase.phase}</h1><p className="presentation-topic">{stored.lesson.title}</p><div className="presentation-timer"><span>{formatClock(secondsLeft)}</span><small>minutes remaining</small></div><div className="presentation-controls"><button className="presentation-button" onClick={() => setRunning((current) => !current)}>{running ? 'Pause timer' : 'Start timer'}</button><button className="presentation-quiet" onClick={() => setSecondsLeft(phase.minutes * 60)}>Reset</button></div><div className="presentation-actions"><div><span>Teacher</span><p>{phase.teacherActions.join(' ')}</p></div><div><span>Students</span><p>{phase.studentActions.join(' ')}</p></div></div><div className="adaptation-panel"><span className="presentation-kicker">LIVE LESSON ADAPTATION</span><p>Make a visible, reversible timing decision while you teach.</p><div className="adaptation-buttons"><button onClick={() => adjustSchedule('slow')}>Slow down</button><button onClick={() => adjustSchedule('example')}>Add another example</button><button onClick={() => adjustSchedule('practice')}>Add 5-minute practice</button><button onClick={() => adjustSchedule('simple')}>Explain more simply</button><button onClick={() => adjustSchedule('diagnostic')}>Ask diagnostic question</button><button onClick={() => adjustSchedule('skip')}>Skip optional activity</button><button onClick={() => adjustSchedule('extend')}>Extend discussion</button></div>{adaptationMessage && <small>{adaptationMessage}</small>}</div></div><aside className="presentation-side"><div className="prompt-card"><span className="presentation-kicker">DISCUSSION PROMPT</span><h2>{prompt?.question || 'What should learners carry forward?'}</h2><p>{prompt?.rationale || 'Invite a concise response before moving to the next phase.'}</p><button className="presentation-quiet" onClick={() => setPromptIndex((current) => (current + 1) % Math.max(prompts.length, 1))}>Next prompt</button></div><div className="diagnostic-card"><span className="presentation-kicker">DIAGNOSTIC QUESTION</span><h2>{currentDiagnostic?.prompt}</h2><p>{currentDiagnostic?.signal}</p><small><b>Response move:</b> {currentDiagnostic?.response}</small><button className="presentation-quiet" onClick={() => setDiagnosticIndex((current) => (current + 1) % Math.max(diagnostics.length, 1))}>Next diagnostic</button></div><div className="example-card"><span className="presentation-kicker">EXAMPLE LADDER</span><h2>{currentExample?.label}</h2><p>{currentExample?.example}</p><small>{currentExample?.teachingMove}</small><div className="example-nav"><button className="presentation-quiet" disabled={ladderIndex === 0} onClick={() => setLadderIndex((current) => Math.max(0, current - 1))}>← Previous</button><button className="presentation-quiet" disabled={!ladder || ladderIndex >= ladder.levels.length - 1} onClick={() => setLadderIndex((current) => Math.min((ladder?.levels.length || 1) - 1, current + 1))}>Next →</button></div></div><div className="checkpoint-card"><span className="presentation-kicker">CLASSROOM CHECKPOINT</span><h2>Make the room visible.</h2><select value={checkpoint} onChange={(event) => { setCheckpoint(event.target.value as CheckpointType); setCheckpointAnswer(''); setCheckpointMessage(''); }}>{checkpointOptions.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select><p>{selectedCheckpoint.prompt}</p><select value={checkpointAnswer} onChange={(event) => setCheckpointAnswer(event.target.value)}><option value="">Select or record a signal</option>{selectedCheckpoint.answers.map((answer) => <option key={answer}>{answer}</option>)}</select><button className="presentation-button" onClick={triggerCheckpoint}>Record checkpoint</button>{checkpointMessage && <small>{checkpointMessage}</small>}</div><div className="presentation-nav"><button className="presentation-quiet" disabled={phaseIndex === 0} onClick={() => setPhaseIndex((current) => Math.max(0, current - 1))}>← Previous</button><button className="presentation-button" disabled={phaseIndex === sequence.length - 1} onClick={() => setPhaseIndex((current) => Math.min(sequence.length - 1, current + 1))}>Next phase →</button></div></aside></section>}
  </main>;
}

function ReflectionPanel({ reflection, setReflection, message, onSave, improvements, onAcceptImprovement, onRejectImprovement, session }: { reflection: LessonReflection; setReflection: (value: LessonReflection) => void; message: string; onSave: () => void; improvements: ReturnType<typeof buildImprovementSuggestions>; onAcceptImprovement: (id: string) => void; onRejectImprovement: (id: string) => void; session?: TeachingSession }) {
  const update = (key: keyof LessonReflection, value: string) => setReflection({ ...reflection, [key]: value });
  const fields: { key: keyof LessonReflection; label: string; placeholder: string }[] = [
    { key: 'whatWorked', label: 'What worked?', placeholder: 'Which part of the lesson felt effective?' },
    { key: 'whereStruggled', label: 'Where did students struggle?', placeholder: 'Note a concept, transition, or instruction that needs attention.' },
    { key: 'discussion', label: 'Which activity generated discussion?', placeholder: 'Capture the strongest discussion or response.' },
    { key: 'reinforcement', label: 'Which concept needs reinforcement?', placeholder: 'Name the idea to revisit next time.' },
    { key: 'timing', label: 'Did the lesson fit the planned time?', placeholder: 'Record what ran long or finished early.' },
    { key: 'nextChange', label: 'What would you change next time?', placeholder: 'Choose one concrete improvement.' },
  ];
  return <section className="reflection-panel"><div className="reflection-heading"><div><span className="presentation-kicker">POST-CLASS REFLECTION</span><h1>Capture the evidence while it is fresh.</h1><p>Reflection notes stay attached to this lesson session and sync to the library when the lesson has already been saved.</p></div><button className="presentation-button" onClick={onSave}>Save reflection</button></div>{session && <div className="session-evidence"><div className="planned-actual"><div><span className="presentation-kicker">PLANNED VS ACTUAL</span><strong>{plannedActualSummary(session).planned} → {plannedActualSummary(session).actual} min</strong><small>{plannedActualSummary(session).difference >= 0 ? '+' : ''}{plannedActualSummary(session).difference} min difference · teaching evidence, not a quality score</small></div><div><span className="presentation-kicker">EVIDENCE EVENTS</span><strong>{session.events.length}</strong><small>{session.status} · {session.cohort || 'No cohort recorded'}</small></div></div><div className="evidence-timeline"><span className="presentation-kicker">TEACHING EVIDENCE TIMELINE</span>{session.events.slice().reverse().map((event) => <div className="evidence-event" key={event.id}><time>{new Date(event.occurredAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</time><div><b>{event.label}</b><small>{event.detail || event.phase || 'Recorded teaching event'}</small></div></div>)}</div></div>}<div className="structured-reflection"><label>How well did learners understand the central idea?<select value={reflection.understanding || 'Mostly understood'} onChange={(event) => update('understanding', event.target.value)}><option>Needs reinforcement</option><option>Mixed</option><option>Mostly understood</option><option>Strong understanding</option></select></label><label>Timing observation<select value={reflection.timingObservation || 'On time'} onChange={(event) => update('timingObservation', event.target.value)}><option>Finished early</option><option>On time</option><option>Ran over</option></select></label><label>Activity engagement<select value={reflection.activityEngagement || 'Moderate'} onChange={(event) => update('activityEngagement', event.target.value)}><option>Low</option><option>Moderate</option><option>High</option></select></label><label>Which concept was difficult?<input value={reflection.difficultConcept || ''} onChange={(event) => update('difficultConcept', event.target.value)} placeholder="Name the concept or moment." /></label><label>Lecturer confidence after the session<input value={reflection.lecturerConfidence || ''} onChange={(event) => update('lecturerConfidence', event.target.value)} placeholder="What would help you teach it more confidently?" /></label><label>Most useful activity<input value={reflection.mostUsefulActivity || ''} onChange={(event) => update('mostUsefulActivity', event.target.value)} placeholder="Which activity or teaching move should recur?" /></label></div><div className="reflection-grid">{fields.map((field) => <label key={field.key}>{field.label}<textarea rows={5} value={reflection[field.key] || ''} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} /></label>)}</div>{message && <p className="reflection-message">{message}</p>}{improvements.length > 0 && <div className="improvement-review"><span className="presentation-kicker">IMPROVEMENT ENGINE</span><h2>Proposed next changes</h2><p>These proposals are based only on the structured evidence you entered. Accepting one creates a new local lesson version; rejecting one leaves the lesson unchanged.</p>{improvements.map((item) => <div className="improvement-item" key={item.id}><div><b>{item.problem}</b><small><strong>Evidence:</strong> {item.evidence}</small><small><strong>Change:</strong> {item.change}</small><div className="improvement-before-after"><span>Before: {item.before}</span><span>After: {item.after}</span></div></div><div className="proposal-actions"><button className="presentation-quiet" disabled={item.status !== 'proposed'} onClick={() => onRejectImprovement(item.id)}>{item.status === 'rejected' ? 'Rejected' : 'Reject'}</button><button className="presentation-button" disabled={item.status !== 'proposed'} onClick={() => onAcceptImprovement(item.id)}>{item.status === 'accepted' ? 'Accepted' : 'Accept'}</button></div></div>)}</div>}</section>;
}
