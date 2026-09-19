'use client';

import { useEffect, useState } from 'react';
import type { GeneratedLesson, LessonRequest } from '../../lib/types';

type StoredLesson = { lesson: GeneratedLesson; form: LessonRequest };

export default function HandoutPage() {
  const [stored, setStored] = useState<StoredLesson | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { try { const raw = window.sessionStorage.getItem('teachcraft-current-lesson'); if (!raw) { setError('Open a lesson from the studio to prepare a handout.'); return; } setStored(JSON.parse(raw) as StoredLesson); } catch { setError('This lesson could not be opened as a handout.'); } }, []);
  if (error) return <main className="handout-shell"><div className="handout-empty"><h1>Student handout</h1><p>{error}</p><button className="primary compact" onClick={() => window.location.assign('/')}>Return to studio</button></div></main>;
  if (!stored) return <main className="handout-shell"><div className="handout-empty"><div className="loader" /><p>Preparing your handout…</p></div></main>;
  const { lesson, form } = stored;
  return <main className="handout-shell"><div className="handout-toolbar"><button className="text-button" onClick={() => window.history.back()}>← Back to lesson</button><div><button className="ghost" onClick={() => window.print()}>Print / Save PDF</button></div></div><article className="handout-card"><header className="handout-header"><div><p className="eyebrow">{form.subject} · {form.level}</p><h1>{lesson.title}</h1><p>{lesson.overview}</p></div><div className="handout-name"><span>Name</span><div /></div></header><section className="handout-section"><h2>Today’s goals</h2><ul>{lesson.learningObjectives.map((item, index) => <li key={index}>{item}</li>)}</ul></section><section className="handout-section"><h2>Think, discuss, apply</h2><p>{lesson.activity.expectedOutcome}</p><ol>{lesson.activity.instructions.map((item, index) => <li key={index}>{item}</li>)}</ol></section><section className="handout-section"><h2>Check your understanding</h2>{lesson.assessment.questions.map((item, index) => <div className="handout-question" key={index}><b>{index + 1}. {item.question}</b><div className="answer-lines"><span /><span /><span /></div></div>)}</section><section className="handout-section reflection"><h2>One idea I’m taking with me</h2><div className="answer-lines"><span /><span /><span /><span /></div></section><footer className="handout-footer"><span>TeachCraft</span><span>{form.topic}</span><span>{form.durationMinutes} min</span></footer></article></main>;
}
