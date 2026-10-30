import OpenAI from 'openai';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';

const MAX_CONTEXT_LENGTH = 500;
const MAX_ANALYSIS_LENGTH = 1200;
const clientCache = new Map<string, OpenAI>();

function client(apiKey: string, baseURL: string) {
    const cacheKey = `${apiKey}:${baseURL}`;
    const existing = clientCache.get(cacheKey);
    if (existing) return existing;
    const created = new OpenAI({ apiKey, baseURL });
    clientCache.set(cacheKey, created);
    return created;
}

async function configuredModels(modelId?: string | null) {
    const supabase = await createClient();
    let query = supabase.from('llm_models')
        .select('model_key, llm_providers(name, base_url, secret_env_var, active)')
        .eq('active', true)
        .order('created_at', { ascending: false });
    if (modelId) query = query.eq('id', modelId);
    const { data, error } = await query;
    if (error) throw new Error(`Unable to load the active LLM configuration: ${error.message}`);
    const configurations = (data ?? []).flatMap((model) => {
        const provider = Array.isArray(model.llm_providers) ? model.llm_providers[0] : model.llm_providers;
        if (!model.model_key || !provider?.active) return [];
        const envName = provider.secret_env_var?.trim() || `${provider.name.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}_API_KEY`;
        const apiKey = process.env[envName]?.trim();
        return apiKey ? [{ model: model.model_key, baseURL: provider.base_url || undefined, apiKey, providerName: provider.name }] : [];
    });
    if (!configurations.length) throw new Error(modelId
        ? 'The selected generation-step model is unavailable or missing its server key.'
        : 'No active LLM model with a configured server key is available. Check the admin LLM settings and Vercel environment variables.');
    return configurations;
}

async function configuredStep(stepKey: 'vision_analysis' | 'caption_generation') {
    const supabase = await createClient();
    const { data, error } = await supabase.from('llm_generation_steps')
        .select('step_key, prompt_template, max_tokens, max_output_chars, temperature, thinking_budget, model_id, active')
        .eq('step_key', stepKey).maybeSingle();
    if (error) throw new Error(`Unable to load ${stepKey} configuration: ${error.message}`);
    if (!data?.active) throw new Error(`Caption generation is unavailable because the ${stepKey} step is inactive.`);
    if (!data.prompt_template || data.max_tokens < 1 || data.max_output_chars < 1) throw new Error(`The ${stepKey} configuration is invalid. Ask an administrator to correct it.`);
    return data;
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
    throw new Error('The active LLM returned no content.');
}

async function complete(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[], stepKey: 'vision_analysis' | 'caption_generation') {
    const step = await configuredStep(stepKey);
    const configurations = await configuredModels(step.model_id);
    const failures: string[] = [];
    for (const configured of configurations) {
        try {
            const result = await client(configured.apiKey, configured.baseURL || 'https://api.openai.com/v1').chat.completions.create({
                model: configured.model,
                max_tokens: step.max_tokens,
                messages,
                ...(step.thinking_budget !== null && configured.providerName.toLowerCase().includes('gemini') ? { extra_body: { google: { thinking_budget: step.thinking_budget } } } : {}),
                ...(step.temperature !== null ? { temperature: step.temperature } : {}),
            });
            return responseText(result);
        } catch (error) {
            failures.push(`${configured.providerName}: ${error instanceof Error ? error.message : 'request failed'}`);
        }
    }
    throw new Error(`All active LLM providers failed. ${failures.join(' | ')}`);
}

export async function generateDescription(imageUrl: string) {
    const step = await configuredStep('vision_analysis');
    const prompt = step.prompt_template.replaceAll('{image}', 'the attached image');
    const image = await visionImage(imageUrl);
    const description = await complete([{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: image } }] }], 'vision_analysis');
    return { description: limit(description, step.max_output_chars, 'No post analysis was returned'), prompt };
}

export async function generateFunnyCaption(description: string, context?: string | null) {
    const step = await configuredStep('caption_generation');
    const prompt = step.prompt_template.replaceAll('{description}', limit(description, MAX_ANALYSIS_LENGTH, 'No post analysis provided')).replaceAll('{context}', limit(context, MAX_CONTEXT_LENGTH, 'No extra context provided'));
    const raw = await complete([{ role: 'user', content: prompt }], 'caption_generation');
    const caption = raw.replace(/\s+/g, ' ').trim()
        .replace(/^(caption|final caption)\s*:\s*/i, '')
        .replace(/^["“']|["”']$/g, '').trim();
    if (!caption) throw new Error('The active LLM returned an empty caption.');
    return { caption, prompt };
}
