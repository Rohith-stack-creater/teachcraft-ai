import { NextResponse } from 'next/server';
import { generateStructured, generationErrorResponse } from '../../../lib/generation-server';
import { lessonJsonSchema, lessonOutputSchema, lessonRequestSchema } from '../../../lib/generation-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Please send a valid lesson brief.', code: 'invalid_json' }, { status: 400 }); }
    const parsed = lessonRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Please complete every field with valid values.', code: 'invalid_request' }, { status: 400 });
    const input = parsed.data;
    const prompt = `Create a rigorous, practical university lesson for a lecturer. Return only valid JSON matching the supplied schema. Do not invent citations or claim current facts without sources. Subject: ${input.subject}. Topic: ${input.topic}. Learner level: ${input.level}. Duration: ${input.durationMinutes} minutes. Objectives: ${input.objectives}. Prior knowledge: ${input.priorKnowledge}. Teaching style: ${input.teachingStyle}. Include an analogy, worked example, misconception correction, active-learning exercise, formative assessment with answers, and a rubric.`;
    const lesson = await generateStructured({
      kind: 'lesson',
      request,
      system: 'You are TeachCraft, an expert university teaching designer. Produce inclusive, level-appropriate material and follow the requested JSON structure exactly.',
      prompt,
      modelSchema: lessonJsonSchema,
      outputSchema: lessonOutputSchema,
    });
    return NextResponse.json(lesson);
  } catch (error) {
    return generationErrorResponse(error);
  }
}
