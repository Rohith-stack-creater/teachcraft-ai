import { NextResponse } from 'next/server';
import { generateStructured, generationErrorResponse } from '../../../lib/generation-server';
import { arcJsonSchema, arcOutputSchema, courseArcRequestSchema } from '../../../lib/generation-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Please send a valid course brief.', code: 'invalid_json' }, { status: 400 }); }
    const parsed = courseArcRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Please complete the course brief with valid values.', code: 'invalid_request' }, { status: 400 });
    const input = parsed.data;
    const prompt = `Design a coherent ${input.weeks}-week university course arc with ${input.sessionsPerWeek} sessions per week. Return only JSON matching the supplied schema. Course: ${input.courseTitle}. Subject: ${input.subject}. Cohort: ${input.cohort}. Final outcome: ${input.finalOutcome}. Each week should progress from concepts to practice and include a concrete activity and check for learning.`;
    const arc = await generateStructured({
      kind: 'arc',
      request,
      system: 'You are TeachCraft, an expert university curriculum designer. Produce inclusive, practical course arcs.',
      prompt,
      modelSchema: arcJsonSchema,
      outputSchema: arcOutputSchema,
    });
    return NextResponse.json(arc);
  } catch (error) {
    return generationErrorResponse(error);
  }
}
