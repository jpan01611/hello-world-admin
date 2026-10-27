export const OPERATION_RESOURCES = [
    'prompt_chains', 'prompt_chain_steps', 'prompt_chain_mix', 'terms',
    'generation_requests', 'ai_generation_examples', 'llm_models',
    'llm_providers', 'llm_responses', 'allowed_signup_domains',
    'whitelisted_email_addresses', 'images',
] as const;

export type OperationResource = typeof OPERATION_RESOURCES[number];

export const OPERATION_LABELS: Record<OperationResource, string> = {
    prompt_chains: 'Prompt chains',
    prompt_chain_steps: 'Chain steps',
    prompt_chain_mix: 'Chain mix',
    terms: 'Terms',
    generation_requests: 'Generation requests',
    ai_generation_examples: 'AI examples',
    llm_models: 'LLM models',
    llm_providers: 'LLM providers',
    llm_responses: 'LLM responses',
    allowed_signup_domains: 'Signup domains',
    whitelisted_email_addresses: 'Whitelisted emails',
    images: 'Images',
};
