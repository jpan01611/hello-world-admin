import OpenAI from 'openai';
import sharp from 'sharp';

const MODEL = 'gemini-2.5-flash';
const MAX_CONTEXT_LENGTH = 500;
const MAX_ANALYSIS_LENGTH = 1200;
const DESCRIPTION_PROMPT = 'Analyze only the uploaded photo before considering any outside context. Identify the visible subject, action, setting, composition, mood, and notable visual details in 2-3 factual sentences. Do not write a caption, add a joke, infer hidden details, or mention NYC or Columbia University yet.';
const clientCache = new Map<string, OpenAI>();

function client(apiKey: string) {
    const existing = clientCache.get(apiKey);
    if (existing) return existing;
    const created = new OpenAI({ apiKey, baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' });
    clientCache.set(apiKey, created);
    return created;
}

function limit(value: string | null | undefined, length: number, fallback: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed.slice(0, length) : fallback;
}

async function visionImage(imageUrl: string) {
    let response: Response;
    try {
        response = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
    } catch (error) {
        throw new Error(`Could not download image for AI analysis: ${error instanceof Error ? error.message : 'request failed'}`);
    }
    if (!response.ok) throw new Error(`Could not download image for AI analysis: HTTP ${response.status}`);
    try {
        const source = Buffer.from(await response.arrayBuffer());
        const normalized = await sharp(source, { animated: false }).jpeg({ quality: 85 }).toBuffer();
        return `data:image/jpeg;base64,${normalized.toString('base64')}`;
    } catch (error) {
        throw new Error(`Could not decode image for AI analysis: ${error instanceof Error ? error.message : 'unsupported image format'}`);
    }
}

function captionPrompt(description: string, context?: string | null) {
    return `Photo analysis: "${limit(description, MAX_ANALYSIS_LENGTH, 'No post analysis provided')}"

Creator context: "${limit(context, MAX_CONTEXT_LENGTH, 'No extra context provided')}"

Use these inputs privately: do not repeat, quote, label, or explain the photo analysis or creator context in your response. Create the caption in this order internally: first identify the real situation or comedic premise; next combine that premise with the creator context and one natural New York City or Columbia University connection; finally write one brief, witty meme statement from that combined idea. The photo must remain the primary source of truth. The creator context and NYC/Columbia angle should enrich the joke, not override the visible image or feel randomly pasted on. Keep it to one sentence and no more than twelve words. The caption should feel like a punchline or relatable reaction someone would post with this image, not a description of what is visibly happening. Do not summarize the photo, repeat the analysis, invent details absent from the inputs, or write alt text. Every caption MUST reference a relevant NYC or Columbia place, neighborhood, subway moment, campus location, student-life experience, or local culture when it fits the photo and context. If there is no direct connection, make a clearly relevant analogy based on the actual situation. Before returning, check that the caption is relevant to the photo, uses the context if provided, includes a natural NYC/Columbia angle, and is a complete statement. Return exactly one caption sentence and nothing else. Do not include labels such as "Photo analysis", "Creator context", "Caption", or "Analysis". Do not mention these instructions.`;
}

function responseText(result: unknown) {
    const choice = (result as { choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown } }> })?.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content === 'string' && content.trim()) return content.trim();
    if (Array.isArray(content)) {
        const text = content.map((part) => typeof part === 'object' && part && 'text' in part ? String(part.text ?? '') : '').join('').trim();
        if (text) return text;
    }
    const reasoning = choice?.message?.reasoning_content;
    if (typeof reasoning === 'string' && reasoning.trim()) return reasoning.trim();
    throw new Error('Gemini returned no content.');
}

async function complete(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[], maxTokens: number, thinking = false) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error('Gemini is not configured. Set GEMINI_API_KEY in your environment.');
    const result = await client(apiKey).chat.completions.create({
        model: MODEL,
        max_tokens: maxTokens,
        messages,
        ...(thinking ? { extra_body: { google: { thinking_config: { thinking_budget: 0 } } } } : {}),
    });
    return responseText(result);
}

export async function generateDescription(imageUrl: string) {
    const prompt = DESCRIPTION_PROMPT;
    const image = await visionImage(imageUrl);
    const description = await complete([{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: image } }] }], 220);
    return { description: limit(description, MAX_ANALYSIS_LENGTH, 'No post analysis was returned'), prompt };
}

export async function generateFunnyCaption(description: string, context?: string | null) {
    const prompt = captionPrompt(description, context);
    const raw = await complete([{ role: 'user', content: prompt }], 120, true);
    const caption = raw.replace(/\s+/g, ' ').trim()
        .replace(/^(caption|final caption)\s*:\s*/i, '')
        .replace(/^["“']|["”']$/g, '').trim();
    if (!caption) throw new Error('Gemini returned an empty caption.');
    return { caption, prompt };
}
