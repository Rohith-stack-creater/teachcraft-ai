import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from './supabase-server';

export type GenerationKind = 'lesson' | 'arc';
type GenerationProvider = 'anthropic' | 'gemini';
type OutputSchema<T> = z.ZodType<T>;

type GenerationOptions<T> = {
  kind: GenerationKind;
  request: Request;
  system: string;
  prompt: string;
  modelSchema: Record<string, unknown>;
  outputSchema: OutputSchema<T>;
};

type UsagePayload = {
  user_id: string;
  event_type: string;
  model: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  duration_ms?: number | null;
  success: boolean;
  error_code?: string | null;
};

type GenerationConfig = {
  provider: GenerationProvider;
  model: string;
  timeoutMs: number;
  dailyLimit: number;
  cooldownSeconds: number;
};

export class GenerationError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfterSeconds?: number) {
    super(message);
    this.name = 'GenerationError';
  }
}

function numericEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function generationConfig(kind: GenerationKind): GenerationConfig {
  const provider: GenerationProvider = process.env.TEACHCRAFT_PROVIDER?.trim().toLowerCase() === 'gemini' ? 'gemini' : 'anthropic';
  return {
    provider,
    model: provider === 'gemini'
      ? process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite'
      : process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-sonnet-latest',
    timeoutMs: numericEnv('TEACHCRAFT_GENERATION_TIMEOUT_MS', 30_000),
    dailyLimit: numericEnv(kind === 'lesson' ? 'TEACHCRAFT_DAILY_LESSON_LIMIT' : 'TEACHCRAFT_DAILY_ARC_LIMIT', kind === 'lesson' ? 10 : 3),
    cooldownSeconds: numericEnv('TEACHCRAFT_GENERATION_COOLDOWN_SECONDS', 10),
  };
}

function providerLabel(config: GenerationConfig) {
  return `${config.provider}:${config.model}`;
}

function providerKey(config: GenerationConfig) {
  return config.provider === 'gemini' ? process.env.GEMINI_API_KEY?.trim() : process.env.ANTHROPIC_API_KEY?.trim();
}

function publicError(error: unknown): GenerationError {
  if (error instanceof GenerationError) return error;
  return new GenerationError(502, 'generation_failed', 'TeachCraft could not generate this right now. Please retry.');
}

async function providerErrorDetail(response: Response) {
  try {
    const body = await response.clone().json() as { error?: unknown };
    if (body.error && typeof body.error === 'object' && 'message' in body.error && typeof body.error.message === 'string') return body.error.message;
    if (typeof body.error === 'string') return body.error;
    return '';
  } catch {
    return '';
  }
}

function upstreamError(status: number, retryAfter?: string | null, detail = '') {
  const retrySeconds = retryAfter ? Math.max(1, Number.parseInt(retryAfter, 10) || 30) : undefined;
  if (/credit balance|purchase credits|plans?\s*&\s*billing|quota|resource exhausted|insufficient/i.test(detail)) return new GenerationError(502, 'provider_credits_unavailable', 'The lesson engine is temporarily unavailable because its generation credits need attention. Please contact the workspace owner to restore generation.');
  if (/api key|permission|authentication|unauthorized|not valid/i.test(detail) && status >= 400 && status < 500) return new GenerationError(502, 'provider_configuration', 'TeachCraft could not generate this right now. The server-side model configuration needs attention.');
  if (status === 401 || status === 403) return new GenerationError(502, 'provider_configuration', 'TeachCraft could not generate this right now. The server-side model configuration needs attention.');
  if (status === 429) return new GenerationError(429, 'provider_rate_limited', 'The lesson engine is busy. Please wait a moment and retry.', retrySeconds);
  if (status >= 500) return new GenerationError(502, 'provider_unavailable', 'The lesson engine is temporarily unavailable. Please retry.');
  return new GenerationError(502, 'provider_error', 'TeachCraft could not generate this right now. Please retry.');
}

function logGenerationFailure(error: unknown, context: Record<string, unknown> = {}) {
  console.error('[teachcraft-generation]', { ...context, error: error instanceof Error ? { name: error.name, message: error.message } : String(error) });
}

async function getAuthenticatedUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.auth.getUser();
    if (result.error || !result.data.user) throw new GenerationError(401, 'auth_required', 'Your session has expired. Sign in again to continue.');
    return { supabase, user: result.data.user };
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    throw new GenerationError(503, 'auth_unavailable', 'Authentication is temporarily unavailable. Please retry.');
  }
}

async function recordUsage(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, payload: UsagePayload) {
  const result = await supabase.from('usage_events').insert(payload);
  if (result.error) throw new GenerationError(503, 'telemetry_unavailable', 'TeachCraft could not verify generation limits. Please retry.');
}

async function checkLimit(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string, kind: GenerationKind, config: GenerationConfig) {
  const since = new Date(); since.setHours(0, 0, 0, 0);
  const eventType = `generation_${kind}`;
  const result = await supabase.from('usage_events').select('created_at').eq('user_id', userId).eq('event_type', eventType).gte('created_at', since.toISOString()).order('created_at', { ascending: false });
  if (result.error) throw new GenerationError(503, 'limit_check_unavailable', 'TeachCraft could not verify generation limits. Please retry.');
  const events = result.data || [];
  if (events.length >= config.dailyLimit) throw new GenerationError(429, 'daily_limit_reached', `You have reached today’s ${kind} generation limit. Please try again tomorrow.`);
  const latest = events[0]?.created_at ? new Date(events[0].created_at).getTime() : 0;
  const remaining = latest ? Math.ceil((latest + config.cooldownSeconds * 1000 - Date.now()) / 1000) : 0;
  if (remaining > 0) throw new GenerationError(429, 'generation_throttled', 'Please wait a moment before starting another generation.', remaining);
}

function extractText(data: unknown, provider: GenerationProvider) {
  if (!data || typeof data !== 'object') return '';
  if (provider === 'gemini') {
    const candidates = (data as { candidates?: unknown }).candidates;
    if (!Array.isArray(candidates)) return '';
    const parts = candidates[0] && typeof candidates[0] === 'object' ? (candidates[0] as { content?: { parts?: unknown } }).content?.parts : undefined;
    if (!Array.isArray(parts)) return '';
    const textPart = parts.find((part) => part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string');
    return textPart && typeof (textPart as { text?: unknown }).text === 'string' ? (textPart as { text: string }).text.trim() : '';
  }
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return '';
  const textItem = content.find((item) => item && typeof item === 'object' && (item as { type?: unknown }).type === 'text');
  return textItem && typeof (textItem as { text?: unknown }).text === 'string' ? (textItem as { text: string }).text.trim() : '';
}

type ProviderRequest = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

function geminiSchema(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of ['type', 'format', 'description', 'enum', 'required']) {
    if (source[key] !== undefined) output[key] = source[key];
  }
  if (source.properties && typeof source.properties === 'object' && !Array.isArray(source.properties)) {
    output.properties = Object.fromEntries(Object.entries(source.properties as Record<string, unknown>).map(([name, child]) => [name, geminiSchema(child)]));
  }
  if (source.items !== undefined) output.items = geminiSchema(source.items);
  return output;
}

function providerRequest(config: GenerationConfig, key: string, options: GenerationOptions<unknown>): ProviderRequest {
  if (config.provider === 'gemini') {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(key)}`,
      headers: { 'content-type': 'application/json' },
      body: {
        systemInstruction: { parts: [{ text: options.system }] },
        contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: geminiSchema(options.modelSchema), maxOutputTokens: 5000 },
      },
    };
  }
  return {
    url: 'https://api.anthropic.com/v1/messages',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: { model: config.model, max_tokens: 5000, system: options.system, messages: [{ role: 'user', content: options.prompt }], output_config: { format: { type: 'json_schema', schema: options.modelSchema } } },
  };
}

export async function generateStructured<T>(options: GenerationOptions<T>) {
  const startedAt = Date.now();
  const config = generationConfig(options.kind);
  const key = providerKey(config);
  if (!key) throw new GenerationError(503, 'provider_not_configured', `The ${config.provider} generation provider is not configured yet. Add its server-side API key to continue.`);
  const { supabase, user } = await getAuthenticatedUser();
  await checkLimit(supabase, user.id, options.kind, config);
  const eventType = `generation_${options.kind}`;
  const model = providerLabel(config);
  await recordUsage(supabase, { user_id: user.id, event_type: eventType, model, success: false });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const request = providerRequest(config, key, options as GenerationOptions<unknown>);
    const response = await fetch(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(request.body), signal: controller.signal });
    if (!response.ok) {
      const detail = await providerErrorDetail(response);
      logGenerationFailure(new Error(detail || `Provider returned HTTP ${response.status}`), { kind: options.kind, provider: config.provider, status: response.status, model: config.model });
      throw upstreamError(response.status, response.headers.get('retry-after'), detail);
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new GenerationError(502, 'provider_invalid_response', 'The lesson engine returned an unreadable response. Please retry.'); }
    const text = extractText(data, config.provider);
    if (!text) throw new GenerationError(502, 'provider_empty_response', 'The lesson engine returned no material. Please retry.');
    let decoded: unknown;
    try { decoded = JSON.parse(text); } catch { throw new GenerationError(502, 'provider_invalid_json', 'The lesson engine returned an unreadable format. Please retry.'); }
    const validated = options.outputSchema.safeParse(decoded);
    if (!validated.success) throw new GenerationError(502, 'provider_schema_mismatch', 'The lesson engine returned an incomplete lesson. Please retry.');
    const usage = data && typeof data === 'object' ? (data as { usage?: { input_tokens?: number; output_tokens?: number }; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }) : undefined;
    await supabase.from('usage_events').insert({ user_id: user.id, event_type: `${eventType}_result`, model, input_tokens: usage?.usageMetadata?.promptTokenCount ?? usage?.usage?.input_tokens ?? null, output_tokens: usage?.usageMetadata?.candidatesTokenCount ?? usage?.usage?.output_tokens ?? null, duration_ms: Date.now() - startedAt, success: true });
    return validated.data;
  } catch (error) {
    const safe = error instanceof DOMException && error.name === 'AbortError' ? new GenerationError(504, 'generation_timeout', 'Generation took too long. Please retry.') : publicError(error);
    logGenerationFailure(error, { kind: options.kind, code: safe.code, provider: config.provider, model: config.model });
    await supabase.from('usage_events').insert({ user_id: user.id, event_type: `${eventType}_result`, model, duration_ms: Date.now() - startedAt, success: false, error_code: safe.code });
    throw safe;
  } finally {
    clearTimeout(timer);
  }
}

export function generationErrorResponse(error: unknown) {
  const safe = publicError(error);
  const headers = safe.retryAfterSeconds ? { 'Retry-After': String(safe.retryAfterSeconds) } : undefined;
  return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status, headers });
}
