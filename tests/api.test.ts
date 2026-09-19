import { afterEach, describe, expect, it } from 'vitest';
import { POST as generateLesson } from '../app/api/generate-lesson/route';
import { POST as generateArc } from '../app/api/generate-arc/route';

const oldKey = process.env.ANTHROPIC_API_KEY;
const lessonRequest = { subject: 'Data Science', topic: 'Classification', level: 'Undergraduate', durationMinutes: 60, objectives: 'Students explain classification and apply it to an example.', priorKnowledge: 'Descriptive statistics', teachingStyle: 'Active seminar' };
const arcRequest = { courseTitle: 'Foundations', subject: 'Data Science', weeks: 6, sessionsPerWeek: 2, cohort: 'Undergraduate', finalOutcome: 'Students can explain core concepts and communicate a defensible conclusion.' };

afterEach(() => { if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = oldKey; });

describe('generation API contracts', () => {
  it('rejects malformed JSON and invalid lesson requests without calling the provider', async () => {
    const malformed = await generateLesson(new Request('http://localhost/api/generate-lesson', { method: 'POST', body: '{' }));
    expect(malformed.status).toBe(400);
    const invalid = await generateLesson(new Request('http://localhost/api/generate-lesson', { method: 'POST', body: JSON.stringify({ ...lessonRequest, durationMinutes: 2 }) }));
    expect(invalid.status).toBe(400);
  });
  it('rejects a valid live request safely when the server key is absent', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const response = await generateLesson(new Request('http://localhost/api/generate-lesson', { method: 'POST', body: JSON.stringify(lessonRequest) }));
    expect(response.status).toBe(503); expect((await response.json()).code).toBe('provider_not_configured');
  });
  it('validates course-arc requests before provider access', async () => {
    const invalid = await generateArc(new Request('http://localhost/api/generate-arc', { method: 'POST', body: JSON.stringify({ ...arcRequest, weeks: 1 }) }));
    expect(invalid.status).toBe(400);
  });
});
